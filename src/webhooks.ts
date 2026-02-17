import { TextChannel, Webhook } from 'discord.js';

/** Cache webhook per channel so we don't fetch on every message */
const webhookCache = new Map<string, Webhook>();

/**
 * Returns the Polyglot webhook for a channel, creating it if it doesn't exist.
 */
export async function getOrCreateWebhook(channel: TextChannel): Promise<Webhook> {
  const cached = webhookCache.get(channel.id);
  if (cached) return cached;

  const webhooks = await channel.fetchWebhooks();
  let webhook = webhooks.find((wh) => wh.owner?.id === channel.client.user?.id);

  if (!webhook) {
    webhook = await channel.createWebhook({
      name: 'Polyglot',
      reason: 'Translation relay webhook',
    });
  }

  webhookCache.set(channel.id, webhook);
  return webhook;
}
