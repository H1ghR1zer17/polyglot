import Anthropic from '@anthropic-ai/sdk';
import { LanguageCode, LANGUAGES } from './config.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-haiku-4-5';

/**
 * Translates `text` from `sourceLang` into `targetLang` using Claude Haiku.
 * Returns only the translated text with no extra commentary.
 */
export async function translate(
  text: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode
): Promise<string | null> {
  const source = LANGUAGES[sourceLang];
  const target = LANGUAGES[targetLang];

  const systemPrompt = `You are a translation engine. Translate the user's text and respond with ONLY a JSON object — nothing else.

Source language: ${source.label}
Target language: ${target.label}
Regional rules: ${target.regionalNote}

Rules:
- Preserve the original meaning, tone, and register faithfully — including slang, profanity, insults, and crude language. Never soften, sanitize, or replace them with milder alternatives.
- Use the equivalent swear words and vulgar expressions that a native speaker would actually use.
- Translate slang into the equivalent regional slang, not a formal version.
- Preserve innuendos — carry the same double meaning into the target language.
- Translate idioms and expressions into culturally equivalent ones, not literally.
- Adapt jokes so they land for a native speaker of the target region.
- If you cannot translate the text, set the value to null.

Respond with ONLY this JSON shape, no markdown, no code fences:
{"exact_translation":"<translated text here>"}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: 'user', content: text },
      { role: 'assistant', content: '{"exact_translation":"' },
    ],
  });

  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Prefill starts with '{"exact_translation":"', Claude completes the value
  // Reconstruct the full JSON and parse it
  const raw = '{"exact_translation":"' + block.text;

  try {
    const parsed = JSON.parse(raw);
    const translation = parsed.exact_translation;
    if (!translation || translation === 'null') return null;
    return translation.trim();
  } catch {
    // Fallback: extract text before the closing quote
    const match = block.text.match(/^(.*?)"/);
    return match ? match[1].trim() || null : null;
  }
}

/**
 * Translates `text` from `sourceLang` into all other supported languages.
 * Returns a map of targetLang -> translatedText.
 */
export async function translateToAll(
  text: string,
  sourceLang: LanguageCode,
  targetLangs: LanguageCode[]
): Promise<Map<LanguageCode, string>> {
  const results = await Promise.all(
    targetLangs.map(async (target) => {
      const translated = await translate(text, sourceLang, target);
      return [target, translated] as [LanguageCode, string | null];
    })
  );

  const filtered = results.filter(([, value]) => value !== null) as [LanguageCode, string][];
  return new Map(filtered);
}
