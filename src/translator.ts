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
 * If Claude repeated the same translation on multiple lines, collapse to one.
 */
function dedup(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return text;
  const unique = [...new Set(lines)];
  return unique.join('\n');
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

  const jsonKey = target.jsonKey;

  const systemPrompt = `You are a ${source.label}-to-${target.label} translation function. You only translate. You never converse, explain, or add anything.

${target.regionalNote}

Instructions:
- Translate the user's text from ${source.label} to ${target.label}.
- Preserve profanity, slang, insults, innuendos, and crude language — translate them into equivalent expressions. Never censor or soften.
- Adapt idioms and jokes to land naturally in ${target.label}.
- Preserve {{number}} placeholders exactly as-is.
- If the input is already in ${target.label}, return it unchanged.

Fill this out:
{"${jsonKey}":""}

Example:
User: ${source.code === 'en' ? 'what the hell is going on lmao {{0}} you seeing this?' : source.code === 'es' ? '¿qué demonios está pasando jaja {{0}} estás viendo esto?' : 'que diabos está acontecendo kkkk {{0}} você tá vendo isso?'}

Response:
{"${jsonKey}":"${target.code === 'en' ? 'what the hell is going on lmao {{0}} you seeing this?' : target.code === 'es' ? '¿qué demonios está pasando jaja {{0}} estás viendo esto?' : 'que diabos está acontecendo kkkk {{0}} você tá vendo isso?'}"}`;

  const prefill = `{"${jsonKey}":"`;

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
    const translation = parsed[jsonKey];
    if (!translation || translation === 'null') return null;
    return restore(dedup(translation.trim()));
  } catch {
    // Fallback: strip any JSON artifacts and return the raw text
    const cleaned = block.text
      .replace(/"\s*\}\s*$/, '')  // trailing "}
      .replace(/^"|"$/g, '')      // stray quotes
      .trim();
    return cleaned ? restore(dedup(cleaned)) : null;
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
