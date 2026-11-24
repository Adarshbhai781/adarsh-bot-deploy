// ======================================
// .broadcast - send message to all chats
// ======================================

import { getSeenChats } from '../lib/router.js';
import { sleep } from '../lib/util.js';
import { BOT_NAME } from '../config.js';

export default {
  name: 'broadcast',
  aliases: ['bc'],
  category: 'Owner',
  description: 'Send a message to all chats the bot has seen',
  usage: '.broadcast <message>',
  ownerOnly: true,

  async execute(ctx) {
    const { reply, text, jid } = ctx;

    if (!text) {
      await reply('📢 Usage: .broadcast <message>\n\nExample: .broadcast Server restart at 10 PM');
      return;
    }

    const chats = getSeenChats();
    const targets = chats.filter(c => c !== jid);

    if (!targets.length) {
      await reply('📭 No chats have messaged the bot yet, so there is nobody to broadcast to.');
      return;
    }

    await reply(`📢 Broadcasting to *${targets.length}* chats... Please wait.`);

    let sent = 0;

    for (const chat of targets) {
      try {
        await ctx.sock.sendMessage(chat, {
          text: `📢 *${BOT_NAME} BROADCAST*\n\n${text}`
        });
        sent += 1;
        await sleep(400);
      } catch {
        // skip chats that fail
      }
    }

    await reply(`✅ Broadcast completed!\n\n📤 Sent to: ${sent}/${targets.length} chats`);
  }
};
