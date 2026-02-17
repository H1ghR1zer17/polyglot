/**
 * Run once to register slash commands with Discord:
 *   npm run deploy
 */
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { data as translateCommand } from './commands/translate.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error('[Polyglot] DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in .env');
  process.exit(1);
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log('[Polyglot] Registering slash commands...');
    await rest.put(Routes.applicationCommands(clientId), {
      body: [translateCommand.toJSON()],
    });
    console.log('[Polyglot] Slash commands registered successfully.');
  } catch (err) {
    console.error('[Polyglot] Failed to register commands:', err);
    process.exit(1);
  }
})();
