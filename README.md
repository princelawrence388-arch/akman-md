# AKMAN MD — Step 1

Telegram public pairing portal + real WhatsApp Multi-Device pairing-code flow.

## What is included
- `/start` channel-gate screen
- Pair WhatsApp button
- Real Baileys pairing-code generation
- Per-user session records in memory
- Normal pair and WhatsApp game pair modes
- Status / list paired menu
- Health endpoint for Render
- No Quick Pair commands

## Setup
```bash
npm install
cp .env.example .env
npm start
```

Set `TELEGRAM_BOT_TOKEN` and `CHANNEL_URL` in `.env`.

## Render
Build command: `npm install`
Start command: `npm start`

Use Node 20+ and persistent storage for production WhatsApp auth. The local `sessions/` directory contains credentials and must not be committed or exposed.

## Important
The WhatsApp channel gate in this starter records the user's explicit confirmation. A Telegram bot cannot independently prove that a person followed a WhatsApp Channel through Baileys, so the project does not fake an automatic follow check.
