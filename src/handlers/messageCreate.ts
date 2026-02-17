import { Message, TextChannel } from 'discord.js';
import { LanguageCode, ALL_LANGUAGE_CODES, getLanguageByChannelId } from '../config.js';
import { translateToAll } from '../translator.js';
import { getOrCreateWebhook } from '../webhooks.js';
import { linkMessages, getLinkedMessageForChannel } from '../messageMap.js';

/** Matches messages that are only emoji (unicode or custom Discord emoji) */
const EMOJI_ONLY = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|<a?:\w+:\d+>|\s)+$/u;

/** Dedup cache — prevents processing the same message twice */
const processed = new Set<string>();
const CACHE_TTL = 60_000; // 1 minute

/**
 * If the message is a reply, try to find the corresponding translated message
 * in the target channel and return a quote block.
 */
async function buildReplyQuote(
  message: Message,
  targetChannelId: string
): Promise<string | null> {
  if (!message.reference?.messageId) return null;

  const refId = message.reference.messageId;
  const linkedRefId = getLinkedMessageForChannel(refId, targetChannelId);
  if (!linkedRefId) return null;

  // Fetch the linked message to get its content for the quote
  try {
    const targetChannel = message.client.channels.cache.get(targetChannelId);
    if (!targetChannel?.isTextBased()) return null;
    const refMsg = await targetChannel.messages.fetch(linkedRefId);
    const quoted = refMsg.content.split('\n')[0]; // first line only
    const author = refMsg.author.username;
    return `> **${author}:** ${quoted.substring(0, 100)}${quoted.length > 100 ? '...' : ''}`;
  } catch {
    return null;
  }
}

export async function handleMessageCreate(
  message: Message,
  channelMap: Record<LanguageCode, string>
): Promise<void> {
  // Ignore bot and webhook messages to prevent translation loops
  if (message.author.bot || message.webhookId) return;

  // Dedup — skip if we already processed this message
  if (processed.has(message.id)) return;
  processed.add(message.id);
  setTimeout(() => processed.delete(message.id), CACHE_TTL);

  // Ignore messages outside the configured language channels
  const sourceLang = getLanguageByChannelId(message.channelId, channelMap);
  if (!sourceLang) return;

  const text = message.content.trim();
  const hasStickers = message.stickers.size > 0;
  const isEmojiOnly = text && EMOJI_ONLY.test(text);

  // Nothing to forward or translate
  if (!text && !hasStickers) return;

  const username = message.member?.displayName ?? message.author.username;
  const avatarURL = message.author.displayAvatarURL();
  const linkedMsgs: { messageId: string; channelId: string }[] = [
    { messageId: message.id, channelId: message.channelId },
  ];
  const targetLangs = ALL_LANGUAGE_CODES.filter((lang) => lang !== sourceLang);

  // Emoji-only or sticker-only messages: forward as-is, no translation needed
  if (isEmojiOnly || (!text && hasStickers)) {
    for (const targetLang of targetLangs) {
      const targetChannelId = channelMap[targetLang];
      const targetChannel = message.client.channels.cache.get(targetChannelId);
      if (!targetChannel?.isTextBased()) continue;

      try {
        const webhook = await getOrCreateWebhook(targetChannel as TextChannel);
        const sent = await webhook.send({ content: text || undefined, username, avatarURL });
        linkedMsgs.push({ messageId: sent.id, channelId: targetChannelId });
      } catch (err) {
        console.error(`[Polyglot] Failed to forward emoji/sticker for "${targetLang}":`, err);
      }
    }

    if (linkedMsgs.length > 1) linkMessages(linkedMsgs);
    return;
  }

  // Text messages: translate
  let translations: Map<LanguageCode, string>;
  try {
    translations = await translateToAll(text, sourceLang, targetLangs);
  } catch (err) {
    console.error(`[Polyglot] Translation error:`, err);
    return;
  }

  for (const [targetLang, translatedText] of translations) {
    const targetChannelId = channelMap[targetLang];
    const targetChannel = message.client.channels.cache.get(targetChannelId);

    if (!targetChannel || !targetChannel.isTextBased()) {
      console.warn(`[Polyglot] Channel for "${targetLang}" not found or not text-based.`);
      continue;
    }

    try {
      // Build reply quote if this message is a reply
      const quote = await buildReplyQuote(message, targetChannelId);
      const content = quote ? `${quote}\n${translatedText}` : translatedText;

      const webhook = await getOrCreateWebhook(targetChannel as TextChannel);
      const sent = await webhook.send({ content, username, avatarURL });
      linkedMsgs.push({ messageId: sent.id, channelId: targetChannelId });
    } catch (err) {
      console.error(`[Polyglot] Failed to send message for "${targetLang}":`, err);
    }
  }

  if (linkedMsgs.length > 1) {
    linkMessages(linkedMsgs);
  }
}
