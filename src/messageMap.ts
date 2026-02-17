/**
 * Tracks which messages are translations of each other across channels.
 * Stores message ID -> channel ID mapping, and groups of linked messages.
 */

interface LinkedMessage {
  messageId: string;
  channelId: string;
}

const links = new Map<string, LinkedMessage[]>();

/** Link a group of messages together (original + all translations) */
export function linkMessages(messages: LinkedMessage[]): void {
  for (const msg of messages) {
    links.set(msg.messageId, messages);
  }
}

/** Get the linked message for a specific channel (excludes the given messageId) */
export function getLinkedMessageForChannel(
  messageId: string,
  targetChannelId: string
): string | null {
  const group = links.get(messageId);
  if (!group) return null;
  const found = group.find(
    (m) => m.channelId === targetChannelId && m.messageId !== messageId
  );
  return found?.messageId ?? null;
}

/** Get all linked message IDs for a given message (excludes itself) */
export function getLinkedMessages(messageId: string): LinkedMessage[] {
  const group = links.get(messageId);
  if (!group) return [];
  return group.filter((m) => m.messageId !== messageId);
}
