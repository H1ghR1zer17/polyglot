# Polyglot

A multichannel Discord translation bot for **English**, **Spanish (Latin American)**, and **Portuguese (Brazilian)** — with culturally aware translations powered by Claude Haiku.

## How it works

- You set up 3 Discord channels: `#english`, `#spanish`, `#portuguese`
- When any user posts a message in one channel, the bot automatically translates it and posts the result to the other two channels
- Translations use Claude Haiku with cultural context prompts — Latin American Spanish, Brazilian Portuguese, idiom-aware
- Messages are attributed to the original author via embeds
- The bot never translates its own messages (no loops)

```
User posts in #english  →  Bot posts ES translation in #spanish
                        →  Bot posts PT translation in #portuguese
```

## Setup

### 1. Discord bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new application
2. Under **Bot**, enable:
   - **Message Content Intent**
   - **Server Members Intent** (optional, for display names)
3. Copy the bot token
4. Invite the bot to your server with the following permissions:
   - `Read Messages / View Channels`
   - `Send Messages`
   - `Embed Links`

### 2. Get channel IDs

Enable **Developer Mode** in Discord (Settings → Advanced → Developer Mode), then right-click each language channel and select **Copy Channel ID**.

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
DISCORD_TOKEN=your_discord_bot_token
ANTHROPIC_API_KEY=your_anthropic_api_key
CHANNEL_EN=<english channel id>
CHANNEL_ES=<spanish channel id>
CHANNEL_PT=<portuguese channel id>
```

### 4. Install and run

```bash
npm install

# Development (ts-node, no build step)
npm run dev

# Production
npm run build
npm start
```

## Project structure

```
src/
├── index.ts               # Bot entrypoint, env validation, Discord client
├── config.ts              # Language definitions and cultural notes
├── translator.ts          # Claude Haiku translation logic
└── handlers/
    └── messageCreate.ts   # Discord event handler, embed builder
```

## Tech stack

| Layer        | Technology             |
|-------------|------------------------|
| Bot          | discord.js v14         |
| Translation  | Claude Haiku (Anthropic) |
| Language     | TypeScript             |
| Config       | dotenv                 |

## License

MIT
