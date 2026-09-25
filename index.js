import 'dotenv/config';
import express from 'express';
import { Telegraf, Markup, session } from 'telegraf';
import pino from 'pino';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is required');

const BOT_NAME = process.env.BOT_NAME || 'AKMAN MD';
const CHANNEL_URL = process.env.CHANNEL_URL || '';
const PORT = Number(process.env.PORT || 3000);
const sessions = new Map();
const app = express();

app.get('/', (_req, res) => res.json({ bot: BOT_NAME, status: 'online' }));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`${BOT_NAME} portal listening on ${PORT}`));

const bot = new Telegraf(TOKEN);

bot.use(session({
  defaultSession: () => ({})
}));
const mainMenu = () => Markup.inlineKeyboard([
  [Markup.button.callback('🎀 PAIR WHATSAPP', 'pair')],
  [Markup.button.callback('📊 MY SESSIONS', 'sessions')],
  [Markup.button.callback('🎮 GAME PAIR', 'game_pair')],
  [Markup.button.callback('📋 GROUPS', 'groups')],
  [Markup.button.callback('🆘 SUPPORT', 'support')]
]);

const controlMenu = () => Markup.inlineKeyboard([
  [Markup.button.callback('🎀 PAIR', 'pair')],
  [Markup.button.callback('🎀 STATUS', 'status'), Markup.button.callback('📋 LIST PAIRED', 'list_paired')],
  [Markup.button.callback('⚰️ REMOVE PAIR', 'remove_pair')],
  [Markup.button.callback('🎮 WHATSAPP GAME PAIR', 'game_pair')],
  [Markup.button.callback('📋 LIST GROUPS', 'groups')],
  [Markup.button.callback('📋 ALL GROUPS', 'all_groups')],
  [Markup.button.callback('⚰️ SUBMIT REPORT', 'report')],
  [Markup.button.callback('⬅️ BACK', 'back')]
]);

function welcome() {
  return `╭━━━━━━━━━━━━━━━━━━━━━━╮
┃       ✦ 𝐀𝐊𝐌𝐀𝐍 𝐌𝐃 ✦
┃     𝐏𝐀𝐈𝐑𝐈𝐍𝐆 𝐏𝐎𝐑𝐓𝐀𝐋
╰━━━━━━━━━━━━━━━━━━━━━━╯

🤖 WhatsApp Multi-Device bot portal
⚡ AI • GROUPS • SECURITY • GAMES

📢 Follow the official WhatsApp Channel before pairing.`;
}

function sessionSummary(ownerId) {
  const list = [...sessions.values()].filter(s => s.ownerId === ownerId);
  if (!list.length) return '📭 No paired sessions yet.';
  return `╭─ ✦ 𝐘𝐎𝐔𝐑 𝐒𝐄𝐒𝐒𝐈𝐎𝐍𝐒 ✦ ─╮\n${list.map((s,i)=>`│ ${i+1}. ${s.number} — ${s.status}`).join('\n')}\n╰────────────────────╯`;
}

async function showStart(ctx) {
  if (ctx.session?.channelGate) return ctx.reply(welcome() + '\n\n✅ Channel gate passed.', mainMenu());
  const rows = [];
  if (CHANNEL_URL) rows.push([Markup.button.url('📢 FOLLOW WHATSAPP CHANNEL', CHANNEL_URL)]);
  rows.push([Markup.button.callback('✅ I HAVE FOLLOWED — CONTINUE', 'verify')]);
  return ctx.reply(welcome() + '\n\n🔐 Channel gate required.', Markup.inlineKeyboard(rows));
}

bot.start(showStart);

bot.action('verify', async ctx => {
  await ctx.answerCbQuery();
  // This is an acknowledgement gate. The Telegram bot cannot independently inspect
  // a user's WhatsApp Channel-follow state through Baileys.
  ctx.session.channelGate = true;
  return ctx.editMessageText('╭─ ✦ 𝐀𝐊𝐌𝐀𝐍 𝐌𝐃 ✦ ─╮\n│\n│ ✅ Channel gate passed.\n│ 🔓 Pairing unlocked.\n│\n╰──────────────────╯', mainMenu());
});

bot.action('pair', async ctx => {
  await ctx.answerCbQuery();
  if (!ctx.session?.channelGate) return showStart(ctx);
  ctx.session.waitingForNumber = 'normal';
  return ctx.reply('🎀 𝐏𝐀𝐈𝐑 𝐖𝐇𝐀𝐓𝐒𝐀𝐏𝐏\n\nSend your WhatsApp number in international format.\nExample: 2348169266441\n\nDigits only — no +, spaces or hyphens.');
});

bot.action('game_pair', async ctx => {
  await ctx.answerCbQuery();
  if (!ctx.session?.channelGate) return showStart(ctx);
  ctx.session.waitingForNumber = 'game';
  return ctx.reply('🎮 𝐖𝐇𝐀𝐓𝐒𝐀𝐏𝐏 𝐆𝐀𝐌𝐄 𝐏𝐀𝐈𝐑\n\nSend the WhatsApp number for the game session.\nExample: 2348169266441');
});

bot.action('sessions', async ctx => { await ctx.answerCbQuery(); return ctx.reply(sessionSummary(ctx.from.id), controlMenu()); });
bot.action('status', async ctx => { await ctx.answerCbQuery(); return ctx.reply(sessionSummary(ctx.from.id)); });
bot.action('list_paired', async ctx => { await ctx.answerCbQuery(); return ctx.reply(sessionSummary(ctx.from.id)); });
bot.action('groups', async ctx => { await ctx.answerCbQuery(); return ctx.reply('📋 Group listing will read groups from your connected WhatsApp sessions in Step 2.'); });
bot.action('all_groups', async ctx => { await ctx.answerCbQuery(); return ctx.reply('📋 All-groups aggregation will be added to the session manager in Step 2.'); });
bot.action('remove_pair', async ctx => { await ctx.answerCbQuery(); return ctx.reply('⚰️ Session removal will be connected to the persistent session registry in Step 2.'); });
bot.action('report', async ctx => { await ctx.answerCbQuery(); ctx.session.reporting = true; return ctx.reply('⚰️ 𝐒𝐔𝐁𝐌𝐈𝐓 𝐑𝐄𝐏𝐎𝐑𝐓\n\nSend the problem and the affected session number.'); });
bot.action('support', async ctx => { await ctx.answerCbQuery(); return ctx.reply('🆘 Use the pairing menu or /submit_report.'); });
bot.action('back', async ctx => { await ctx.answerCbQuery(); return showStart(ctx); });

bot.command('pair', ctx => { if (!ctx.session?.channelGate) return showStart(ctx); ctx.session.waitingForNumber='normal'; return ctx.reply('🎀 Send your WhatsApp number in international format, digits only.'); });
bot.command('status', ctx => ctx.reply(sessionSummary(ctx.from.id)));
bot.command('list_paired', ctx => ctx.reply(sessionSummary(ctx.from.id)));
bot.command('submit_report', ctx => { ctx.session.reporting=true; return ctx.reply('⚰️ Send the problem and affected session number.'); });

bot.on('text', async ctx => {
  const text = ctx.message.text.trim();
  if (ctx.session?.reporting && !text.startsWith('/')) {
    ctx.session.reporting = false;
    return ctx.reply('✅ Report received. The report storage/owner-forwarding module will be added next.');
  }
  const mode = ctx.session?.waitingForNumber;
  if (!mode || text.startsWith('/')) return;
  const number = text.replace(/\D/g, '');
  if (number.length < 8 || number.length > 15) return ctx.reply('❌ Invalid number. Example: 2348169266441');
  ctx.session.waitingForNumber = null;
  const sessionId = `${ctx.from.id}-${mode}-${number}`;
  try {
    await startWhatsAppSession({ sessionId, ownerId: ctx.from.id, number, type: mode }, ctx);
  } catch (err) {
    console.error(err);
    await ctx.reply('❌ Could not start pairing. Check the server logs and try again.');
  }
});

async function startWhatsAppSession({sessionId, ownerId, number, type}, ctx) {
  const authDir = path.join(__dirname, 'sessions', sessionId);
  fs.mkdirSync(authDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const record = { sessionId, ownerId, number, type, status: 'connecting', sock: null };
  sessions.set(sessionId, record);

  const sock = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu(BOT_NAME),
    printQRInTerminal: false,
    logger: pino({ level: 'silent' })
  });
  record.sock = sock;
  sock.ev.on('creds.update', saveCreds);

  let pairingRequested = false;
  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect, qr } = update;
    if (!pairingRequested && !state.creds.registered && (connection === 'connecting' || !!qr)) {
      pairingRequested = true;
      try {
        const code = await sock.requestPairingCode(number);
        await ctx.reply(`╭─ 🔐 𝐏𝐀𝐈𝐑𝐈𝐍𝐆 𝐂𝐎𝐃𝐄 ─╮\n│\n│       ${code}\n│\n╰────────────────────╯\n\nWhatsApp → Settings → Linked Devices → Link a Device → Link with phone number instead → enter the code.\n\n⏳ Waiting for connection...`);
      } catch (err) {
        pairingRequested = false;
        console.error('pairing code error', err);
        await ctx.reply('❌ WhatsApp did not issue a pairing code. Try again in a moment.');
      }
    }
    if (connection === 'open') {
      record.status = 'connected';
      await ctx.reply(`✅ 𝐖𝐇𝐀𝐓𝐒𝐀𝐏𝐏 𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐄𝐃\n\n📱 ${number}\n🤖 ${BOT_NAME}\n🎯 Mode: ${type}`);
    }
    if (connection === 'close') {
      record.status = 'disconnected';
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        setTimeout(() => startWhatsAppSession({sessionId, ownerId, number, type}, ctx).catch(console.error), 3000);
      }
    }
  });
}

bot.catch((err, ctx) => { console.error('Telegram error:', err); ctx.reply('❌ Unexpected error.').catch(()=>{}); });
bot.launch().then(() => console.log(`✓ ${BOT_NAME} Telegram portal online`));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
