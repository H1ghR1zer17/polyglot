import { Message, TextChannel } from 'discord.js';
import { LanguageCode, ALL_LANGUAGE_CODES, getLanguageByChannelId } from '../config.js';
import { translateToAll } from '../translator.js';
import { getOrCreateWebhook } from '../webhooks.js';
import { linkMessages, getLinkedMessageForChannel } from '../messageMap.js';

/** Matches messages that are only emoji (unicode or custom Discord emoji) */
const EMOJI_ONLY = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|<a?:\w+:\d+>|\s)+$/u;

/** Dedup cache — prevents processing the same message twice */
const processed = new Set<string>();
/** Send-side dedup — prevents sending to the same channel twice for one source message */
const sent = new Set<string>();
const CACHE_TTL = 60_000; // 1 minute

/**
 * If the message is a reply, find the linked message ID in the target channel.
 */
function findReplyTarget(message: Message, targetChannelId: string): string | null {
  if (!message.reference?.messageId) return null;
  return getLinkedMessageForChannel(message.reference.messageId, targetChannelId);
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

    // Send-side dedup — skip if we already sent for this source→target combo
    const sendKey = `${message.id}:${targetChannelId}`;
    if (sent.has(sendKey)) continue;
    sent.add(sendKey);
    setTimeout(() => sent.delete(sendKey), CACHE_TTL);

    try {
      const replyTargetId = findReplyTarget(message, targetChannelId);

      let sent: Message;
      if (replyTargetId) {
        // Use bot's channel.send with reply — shows native Discord reply arrow
        sent = await (targetChannel as TextChannel).send({
          content: `**${username}:** ${translatedText}`,
          reply: { messageReference: replyTargetId, failIfNotExists: false },
        });
      } else {
        // Regular message — use webhook to show as the original user
        const webhook = await getOrCreateWebhook(targetChannel as TextChannel);
        sent = await webhook.send({ content: translatedText, username, avatarURL }) as Message;
      }

      linkedMsgs.push({ messageId: sent.id, channelId: targetChannelId });
    } catch (err) {
      console.error(`[Polyglot] Failed to send message for "${targetLang}":`, err);
    }
  }

  if (linkedMsgs.length > 1) {
    linkMessages(linkedMsgs);
  }
}
