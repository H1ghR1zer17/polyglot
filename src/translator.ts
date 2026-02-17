import Anthropic from '@anthropic-ai/sdk';
import { LanguageCode, LANGUAGES } from './config.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-haiku-4-5';

/** Matches Discord mentions, channels, roles, and custom emojis */
const DISCORD_TOKEN_RE = /(<@!?\d+>|<#\d+>|<@&\d+>|<a?:\w+:\d+>)/g;

/**
 * Replaces Discord tokens with placeholders before translation,
 * then restores them after.
 */
function extractDiscordTokens(text: string): { cleaned: string; restore: (translated: string) => string } {
  const tokens: string[] = [];
  const cleaned = text.replace(DISCORD_TOKEN_RE, (match) => {
    tokens.push(match);
    return `{{${tokens.length - 1}}}`;
  });
  return {
    cleaned,
    restore: (translated: string) =>
      translated.replace(/\{\{(\d+)\}\}/g, (_, i) => tokens[Number(i)] ?? ''),
  };
}

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

  // Pull out Discord mentions/emojis so Claude doesn't touch them
  const { cleaned: textToTranslate, restore } = extractDiscordTokens(text);

  const systemPrompt = `You are a strict ${source.label}-to-${target.label} translation function. You are NOT a chatbot. You do NOT converse, explain, comment, refuse, or add anything. You ONLY translate.

INPUT: ${source.label} text
OUTPUT: JSON with the translation in ${target.label}

${target.regionalNote}

STRICT RULES:
1. Translate the input text. That is your ONLY job.
2. Never add commentary, explanations, warnings, or notes.
3. Never ask questions or refuse to translate.
4. Preserve profanity, slang, insults, and crude language — translate them into equivalent expressions in ${target.label}. Never censor or soften.
5. Preserve innuendos and double meanings.
6. Adapt idioms and jokes to land naturally in ${target.label}.
7. Preserve {{number}} placeholders exactly as-is.
8. Output the translation exactly ONCE — never duplicate.
9. If the input is already in ${target.label}, return it unchanged.

OUTPUT FORMAT (JSON only, no markdown):
{"${target.jsonKey}":"translated text"}`;

  const prefill = `{"${target.jsonKey}":"`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: 'user', content: textToTranslate },
      { role: 'assistant', content: prefill },
    ],
  });

  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Reconstruct full JSON and parse it
  const raw = prefill + block.text;

  try {
    const parsed = JSON.parse(raw);
    const translation = parsed[target.jsonKey];
    if (!translation || translation === 'null') return null;
    return restore(translation.trim());
  } catch {
    // Fallback: strip any JSON artifacts and return the raw text
    const cleaned = block.text
      .replace(/"\s*\}\s*$/, '')  // trailing "}
      .replace(/^"|"$/g, '')      // stray quotes
      .trim();
    return cleaned ? restore(cleaned) : null;
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
