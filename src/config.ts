export type LanguageCode = 'en' | 'es' | 'pt';

export interface LanguageConfig {
  code: LanguageCode;
  label: string;
  channelEnvKey: string;
  /** Detailed instruction for the translator to use the correct regional variety */
  regionalNote: string;
}

export const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  en: {
    code: 'en',
    label: 'English',
    channelEnvKey: 'CHANNEL_EN',
    regionalNote: 'Use clear, natural English. Match the tone and register of the original message (casual, formal, slang, etc.).',
  },
  es: {
    code: 'es',
    label: 'Spanish',
    channelEnvKey: 'CHANNEL_ES',
    regionalNote:
      'Use Latin American Spanish (not Castilian/Spain Spanish). Avoid "vosotros" — use "ustedes" instead. Prefer vocabulary common across Latin America. Match the tone and register of the original message (casual, formal, slang, etc.).',
  },
  pt: {
    code: 'pt',
    label: 'Portuguese',
    channelEnvKey: 'CHANNEL_PT',
    regionalNote:
      'Use Brazilian Portuguese (not European Portuguese). Use "você" instead of "tu" as the default second person. Prefer vocabulary and spelling conventions of Brazil. Match the tone and register of the original message (casual, formal, slang, etc.).',
  },
};

/** All language codes in a list for iteration */
export const ALL_LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];

/**
 * Returns the language code for a given channel ID, or null if not a language channel.
 */
export function getLanguageByChannelId(
  channelId: string,
  channelMap: Record<LanguageCode, string>
): LanguageCode | null {
  for (const [code, id] of Object.entries(channelMap)) {
    if (id === channelId) return code as LanguageCode;
  }
  return null;
}
