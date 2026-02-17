import { Message, TextChannel } from 'discord.js';
import { LanguageCode, ALL_LANGUAGE_CODES, getLanguageByChannelId } from '../config.js';
import { translateToAll } from '../translator.js';
import { getOrCreateWebhook } from '../webhooks.js';
import { linkMessages } from '../messageMap.js';

export async function handleMessageCreate(
  message: Message,
  channelMap: Record<LanguageCode, string>
): Promise<void> {
  // Ignore bot and webhook messages to prevent translation loops
  if (message.author.bot || message.webhookId) return;

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

  const username = message.member?.displayName ?? message.author.username;
  const avatarURL = message.author.displayAvatarURL();
  const linkedIds: string[] = [message.id];

  for (const [targetLang, translatedText] of translations) {
    const targetChannelId = channelMap[targetLang];
    const targetChannel = message.client.channels.cache.get(targetChannelId);

    if (!targetChannel || !targetChannel.isTextBased()) {
      console.warn(`[Polyglot] Channel for "${targetLang}" not found or not text-based.`);
      continue;
    }

    try {
      const webhook = await getOrCreateWebhook(targetChannel as TextChannel);
      const sent = await webhook.send({ content: translatedText, username, avatarURL });
      linkedIds.push(sent.id);
    } catch (err) {
      console.error(`[Polyglot] Failed to send message for "${targetLang}":`, err);
    }
  }

  // Link original + all translations so reactions can be mirrored
  if (linkedIds.length > 1) {
    linkMessages(linkedIds);
  }
}
