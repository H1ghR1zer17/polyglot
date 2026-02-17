import { MessageReaction, User, PartialMessageReaction, PartialUser } from 'discord.js';
import { LanguageCode, ALL_LANGUAGE_CODES } from '../config.js';
import { getLinkedMessages } from '../messageMap.js';

export async function handleMessageReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  channelMap: Record<LanguageCode, string>
): Promise<void> {
  // Ignore bot reactions
  if (user.bot) return;

  // Fetch partial reaction if needed
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  }

  const messageId = reaction.message.id;
  const linked = getLinkedMessages(messageId);
  if (linked.length === 0) return;

  const emoji = reaction.emoji;
  const allChannelIds = ALL_LANGUAGE_CODES.map((lang) => channelMap[lang]);

  for (const linkedId of linked) {
    // Find which channel has this linked message
    for (const channelId of allChannelIds) {
      const channel = reaction.message.client.channels.cache.get(channelId);
      if (!channel?.isTextBased()) continue;

      try {
        const msg = await channel.messages.fetch(linkedId);
        await msg.react(emoji.id ?? emoji.name!);
        break; // Found the message, no need to check other channels
      } catch {
        // Message not in this channel, try next
        continue;
      }
    }
  }
}
