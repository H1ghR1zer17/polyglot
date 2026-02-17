import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { LanguageCode, LANGUAGES, ALL_LANGUAGE_CODES } from '../config.js';
import { translateToAll } from '../translator.js';

const LANGUAGE_FLAGS: Record<LanguageCode, string> = {
  en: '🇺🇸',
  es: '🇲🇽',
  pt: '🇧🇷',
};

export const data = new SlashCommandBuilder()
  .setName('translate')
  .setDescription('Test a translation (ephemeral — only you can see the result)')
  .addStringOption((opt) =>
    opt
      .setName('text')
      .setDescription('The text to translate')
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName('from')
      .setDescription('Source language')
      .setRequired(true)
      .addChoices(
        { name: '🇺🇸 English', value: 'en' },
        { name: '🇲🇽 Spanish', value: 'es' },
        { name: '🇧🇷 Portuguese', value: 'pt' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const text = interaction.options.getString('text', true);
  const sourceLang = interaction.options.getString('from', true) as LanguageCode;
  const targetLangs = ALL_LANGUAGE_CODES.filter((l) => l !== sourceLang);

  await interaction.deferReply({ ephemeral: true });

  let translations: Map<LanguageCode, string>;
  try {
    translations = await translateToAll(text, sourceLang, targetLangs);
  } catch (err) {
    console.error('[Polyglot] /translate error:', err);
    await interaction.editReply({ content: 'Translation failed. Check the logs.' });
    return;
  }

  const lines = [
    `${LANGUAGE_FLAGS[sourceLang]} **${LANGUAGES[sourceLang].label}:** ${text}`,
    ...targetLangs.map(
      (lang) => `${LANGUAGE_FLAGS[lang]} **${LANGUAGES[lang].label}:** ${translations.get(lang) ?? '—'}`
    ),
  ];

  await interaction.editReply({ content: lines.join('\n') });
}
