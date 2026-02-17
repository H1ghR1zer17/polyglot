import { Message, TextChannel } from 'discord.js';
import { LanguageCode, ALL_LANGUAGE_CODES, getLanguageByChannelId } from '../config.js';
import { translateToAll } from '../translator.js';
import { getOrCreateWebhook } from '../webhooks.js';

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

  // Post each translation via webhook so it appears as the original user
  for (const [targetLang, translatedText] of translations) {
    const targetChannelId = channelMap[targetLang];
    const targetChannel = message.client.channels.cache.get(targetChannelId);

    if (!targetChannel || !targetChannel.isTextBased()) {
      console.warn(`[Polyglot] Channel for "${targetLang}" not found or not text-based.`);
      continue;
    }

    try {
      const webhook = await getOrCreateWebhook(targetChannel as TextChannel);
      await webhook.send({
        content: translatedText,
        username: message.member?.displayName ?? message.author.username,
        avatarURL: message.author.displayAvatarURL(),
      });
    } catch (err) {
      console.error(`[Polyglot] Failed to send webhook message for "${targetLang}":`, err);
    }
  }
}
