import { SlashCommandBuilder, ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { LanguageCode, LANGUAGES, ALL_LANGUAGE_CODES } from '../config.js';
import { translateToAll } from '../translator.js';

const LANGUAGE_FLAGS: Record<LanguageCode, string> = {
  en: '🇺🇸',
  es: '🇲🇽',
  pt: '🇧🇷',
};

export const data = new SlashCommandBuilder()
  .setName('translate')
  .setDescription('Send a translated message to all language channels')
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

export async function execute(
  interaction: ChatInputCommandInteraction,
  channelMap: Record<LanguageCode, string>
): Promise<void> {
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

  // Post source text to its own channel
  const sourceChannelId = channelMap[sourceLang];
  const sourceChannel = interaction.client.channels.cache.get(sourceChannelId);
  if (sourceChannel?.isTextBased()) {
    await (sourceChannel as TextChannel).send(text);
  }

  // Post each translation to its channel
  for (const [targetLang, translatedText] of translations) {
    const targetChannelId = channelMap[targetLang];
    const targetChannel = interaction.client.channels.cache.get(targetChannelId);
    if (targetChannel?.isTextBased()) {
      await (targetChannel as TextChannel).send(translatedText);
    }
  }

  await interaction.editReply({
    content: `${LANGUAGE_FLAGS[sourceLang]} Sent to all channels.`,
  });
}
