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

  const systemPrompt = `You are a translation engine. You receive text inside <translate> tags and output ONLY the translated text inside <result> tags — nothing else.

Target language: ${target.label}
Regional rules: ${target.regionalNote}

Additional rules:
- Preserve the original meaning, tone, and register faithfully — including slang, profanity, insults, and crude language. Never soften, sanitize, or replace them with milder alternatives.
- Use the equivalent swear words and vulgar expressions that a native speaker of the target language would actually use in that context.
- Recognize and preserve slang: translate it into the equivalent slang of the target region, not a formal or literal version.
- Recognize and preserve innuendos: carry the same double meaning or suggestive implication into the target language using expressions a native speaker would naturally use for that innuendo.
- Translate idioms and expressions into culturally equivalent ones — do not translate them literally.
- When translating jokes, adapt them so they land for a native speaker of the target region. Never translate a joke literally if it would make it unfunny or confusing.
- Do NOT ask questions, add commentary, or explain anything.
- Do NOT include phrases like "Translation:" or "In ${target.label}:".
- If the text cannot be translated for any reason, respond with exactly: <result>[SKIP]</result>
- Output format: <result>translated text here</result>`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `<translate>${text}</translate>`,
      },
      {
        // Assistant prefill — forces Claude to continue with the translation
        // instead of opening a conversational response
        role: 'assistant',
        content: '<result>',
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Extract content from <result> tags (prefill starts with <result>, Claude closes it)
  const match = block.text.match(/<result>([\s\S]*?)<\/result>/);
  const result = (match ? match[1] : block.text).trim();
  return result === '[SKIP]' ? null : result;
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

  // Filter out skipped translations
  const filtered = results.filter(([ , value]) => value !== null) as [LanguageCode, string][];
  return new Map(filtered);
}
