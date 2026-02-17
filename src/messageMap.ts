/**
 * Tracks which messages are translations of each other across channels.
 * Maps a message ID to all its linked translated message IDs.
 */
const links = new Map<string, Set<string>>();

/** Link a group of message IDs together (original + all translations) */
export function linkMessages(messageIds: string[]): void {
  const idSet = new Set(messageIds);
  for (const id of messageIds) {
    links.set(id, idSet);
  }
}

/** Get all linked message IDs for a given message (excludes itself) */
export function getLinkedMessages(messageId: string): string[] {
  const group = links.get(messageId);
  if (!group) return [];
  return [...group].filter((id) => id !== messageId);
}
