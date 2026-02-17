import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { ALL_LANGUAGE_CODES, LanguageCode } from './config.js';
import { handleMessageCreate } from './handlers/messageCreate.js';

// ---------------------------------------------------------------------------
// Validate required environment variables
// ---------------------------------------------------------------------------
const required = ['DISCORD_TOKEN', 'ANTHROPIC_API_KEY', 'CHANNEL_EN', 'CHANNEL_ES', 'CHANNEL_PT'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[Polyglot] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// Build the channel map from env vars
const channelMap = Object.fromEntries(
  ALL_LANGUAGE_CODES.map((lang) => {
    const key = `CHANNEL_${lang.toUpperCase()}`;
    return [lang, process.env[key] as string];
  })
) as Record<LanguageCode, string>;

// ---------------------------------------------------------------------------
// Discord client
// ---------------------------------------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`[Polyglot] Logged in as ${c.user.tag}`);
  console.log(`[Polyglot] Watching channels:`);
  for (const lang of ALL_LANGUAGE_CODES) {
    console.log(`  ${lang.toUpperCase()} → ${channelMap[lang]}`);
  }
});

client.on(Events.MessageCreate, (message) => {
  handleMessageCreate(message, channelMap).catch((err) => {
    console.error('[Polyglot] Unhandled error in messageCreate:', err);
  });
});

client.login(process.env.DISCORD_TOKEN);
