import {
  Message,
  TextChannel,
  EmbedBuilder,
  Colors,
} from 'discord.js';
import {
  LanguageCode,
  LANGUAGES,
  ALL_LANGUAGE_CODES,
  getLanguageByChannelId,
} from '../config.js';
import { translateToAll } from '../translator.js';

/** Color per language for embed sidebars */
const LANGUAGE_COLORS: Record<LanguageCode, number> = {
  en: Colors.Blue,
  es: Colors.Red,
  pt: Colors.Green,
};

/** Flag emoji per language */
const LANGUAGE_FLAGS: Record<LanguageCode, string> = {
  en: '🇺🇸',
  es: '🇲🇽',
  pt: '🇧🇷',
};

export async function handleMessageCreate(
  message: Message,
  channelMap: Record<LanguageCode, string>
): Promise<void> {
  // Ignore bot messages to prevent translation loops
  if (message.author.bot) return;

  // Ignore messages outside the configured language channels
  const sourceLang = getLanguageByChannelId(message.channelId, channelMap);
  if (!sourceLang) return;

  // Ignore empty messages (attachments only, stickers, etc.)
  const text = message.content.trim();
  if (!text) return;

  const targetLangs = ALL_LANGUAGE_CODES.filter((lang) => lang !== sourceLang);

  let translations: Map<LanguageCode, string>;
  try {
    translations = await translateToAll(text, sourceLang, targetLangs);
  } catch (err) {
    console.error(`[Polyglot] Translation error:`, err);
    return;
  }

  // Post each translation into the corresponding channel
  for (const [targetLang, translatedText] of translations) {
    const targetChannelId = channelMap[targetLang];
    const targetChannel = message.client.channels.cache.get(targetChannelId);

    if (!targetChannel || !targetChannel.isTextBased()) {
      console.warn(`[Polyglot] Channel for "${targetLang}" not found or not text-based.`);
      continue;
    }

    const embed = new EmbedBuilder()
      .setColor(LANGUAGE_COLORS[sourceLang])
      .setAuthor({
        name: message.author.displayName ?? message.author.username,
        iconURL: message.author.displayAvatarURL(),
      })
      .setDescription(translatedText)
      .setFooter({
        text: `${LANGUAGE_FLAGS[sourceLang]} Translated from ${LANGUAGES[sourceLang].label} → ${LANGUAGE_FLAGS[targetLang]} ${LANGUAGES[targetLang].label}`,
      })
      .setTimestamp(message.createdAt);

    await (targetChannel as TextChannel).send({ embeds: [embed] });
  }
}
