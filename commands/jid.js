// ======================================
// .jid - get chat / user JID
// ======================================

import { numberFromJid } from '../lib/jid.js';

export default {
  name: 'jid',
  category: 'General',
  description: 'Get the JID of this chat or a replied user',
  usage: '.jid (or reply to a message)',
  public: true,

  async execute(ctx) {
    const { msg, jid, senderJid, isGroup, reply } = ctx;

    const context = msg.message?.extendedTextMessage?.contextInfo;
    const target = context?.mentionedJid?.[0] || context?.participant;

    if (target) {
      await reply(
        `🆔 *User JID*\n\n` +
        `📱 JID: ${target}\n` +
        `📞 Number: +${numberFromJid(target)}`
      );
      return;
    }

    await reply(
      `🆔 *Chat JID*\n\n` +
      `💬 JID: ${jid}\n` +
      `${isGroup ? '👥 Type: Group' : '👤 Type: Private chat'}\n` +
      `🙋 Your JID: ${senderJid}`
    );
  }
};
