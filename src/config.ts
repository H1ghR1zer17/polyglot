export type LanguageCode = 'en' | 'es' | 'pt';

export interface LanguageConfig {
  code: LanguageCode;
  label: string;
  channelEnvKey: string;
  /** Detailed instruction for the translator to use the correct regional variety */
  regionalNote: string;
  /** Descriptive JSON key that gives the LLM context about the expected output */
  jsonKey: string;
}

export const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  en: {
    code: 'en',
    label: 'English',
    channelEnvKey: 'CHANNEL_EN',
    regionalNote: 'Use clear, natural, conversational English. Think how an educated young adult texts casually — relaxed but not exaggerated slang. Only use slang where it genuinely fits.',
    jsonKey: 'natural_english_translation_preserving_tone_slang_and_profanity',
  },
  es: {
    code: 'es',
    label: 'Spanish',
    channelEnvKey: 'CHANNEL_ES',
    regionalNote:
      'Use neutral, standard Spanish — the kind understood across all Spanish-speaking countries. Avoid region-specific slang, colloquialisms, or expressions tied to any one country. Default to relaxed, conversational tone — think how an educated young adult texts casually. Use "ustedes" not "vosotros". Keep it natural and clear.',
    jsonKey: 'neutral_standard_spanish_translation_conversational_tone_preserving_profanity',
  },
  pt: {
    code: 'pt',
    label: 'Portuguese',
    channelEnvKey: 'CHANNEL_PT',
    regionalNote:
      'Use Brazilian Portuguese from Rio de Janeiro. Default to relaxed, conversational tone — not overly formal but not exaggerated carioca slang either. Think how an educated young adult from Rio texts casually. Use natural carioca vocabulary and expressions but do NOT overdo it — only use Rio slang where it genuinely fits. Use "você" as the default second person.',
    jsonKey: 'carioca_rio_brazilian_portuguese_translation_with_rio_slang_informal_tone_and_profanity',
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
