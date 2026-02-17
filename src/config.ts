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
    regionalNote: 'Use clear, natural, casual English — like texting a friend. Default to informal tone unless the original message is clearly formal.',
    jsonKey: 'natural_english_translation_preserving_tone_slang_and_profanity',
  },
  es: {
    code: 'es',
    label: 'Spanish',
    channelEnvKey: 'CHANNEL_ES',
    regionalNote:
      'Use Mexican Spanish from Mexico City (CDMX/chilango) specifically. Default to casual, everyday chilango speech — like texting a friend from la Ciudad de México. Use vocabulary, slang, and expressions native to CDMX — including chilango street slang, albures, and colloquialisms. Avoid Castilian/Spain Spanish and avoid generic Latin American terms when a more specific CDMX word exists. Use "ustedes" not "vosotros".',
    jsonKey: 'cdmx_chilango_spanish_translation_with_mexico_city_slang_albures_and_profanity',
  },
  pt: {
    code: 'pt',
    label: 'Portuguese',
    channelEnvKey: 'CHANNEL_PT',
    regionalNote:
      'Use Brazilian Portuguese from Rio de Janeiro specifically. Default to casual, everyday carioca speech — like texting a friend from Rio. Use carioca vocabulary, slang, and expressions — including Rio street slang and colloquialisms. Use "você" as the default second person. Prefer the informal, warm speech style typical of Rio de Janeiro.',
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
