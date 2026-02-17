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
): Promise<string> {
  const source = LANGUAGES[sourceLang];
  const target = LANGUAGES[targetLang];

  const systemPrompt = `You are a translator specializing in culturally accurate, unfiltered translations.
Your task is to translate text from ${source.label} to ${target.label}.

Important rules:
- ${target.regionalNote}
- Preserve the original meaning, tone, and register faithfully — including slang, profanity, insults, and crude language. Never soften, sanitize, or replace them with milder alternatives.
- Use the equivalent swear words and vulgar expressions that a native speaker of the target language would actually use in that context.
- Translate idioms and expressions into culturally equivalent ones in the target language — do not translate them literally.
- Do NOT add explanations, notes, or commentary.
- Do NOT include phrases like "Translation:" or "In ${target.label}:".
- Output ONLY the translated text, nothing else.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: text,
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return block.text.trim();
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
      return [target, translated] as [LanguageCode, string];
    })
  );

  return new Map(results);
}
