import { MessageReaction, User, PartialMessageReaction, PartialUser } from 'discord.js';
import { LanguageCode } from '../config.js';
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

  for (const { messageId: linkedId, channelId } of linked) {
    const channel = reaction.message.client.channels.cache.get(channelId);
    if (!channel?.isTextBased()) continue;

    try {
      const msg = await channel.messages.fetch(linkedId);
      await msg.react(emoji.id ?? emoji.name!);
    } catch {
      // Message not found or can't react
      continue;
    }
  }
}
