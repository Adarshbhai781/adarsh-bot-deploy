// ======================================
// .warnings - check warnings of a user
// ======================================

import { resolveTarget } from '../lib/groupHelper.js';
import { getWarns } from '../lib/store.js';
import { numberFromJid } from '../lib/jid.js';
import { currentTimeIST } from '../lib/util.js';

export default {
  name: 'warnings',
  category: 'Group Admin',
  description: 'Show warnings of a member',
  usage: '.warnings @user',
  adminOnly: true,
  groupOnly: true,

  async execute(ctx) {
    const { msg, args, jid, reply } = ctx;

    const target = resolveTarget(msg, args);

    if (!target) {
      await reply('❌ Mention or reply to the user you want to check.\n\nExample: .warnings @user');
      return;
    }

    const warn = await getWarns(jid, target);

    if (!warn.count) {
      await reply(`✅ @${numberFromJid(target)} has no warnings. Clean record! 🎉`, {
        mentions: [target]
      });
      return;
    }

    const reasonList = warn.reasons
      .map((r, i) => `${i + 1}. ${r.reason}\n   🕐 ${currentTimeIST(new Date(r.ts))}`)
      .join('\n');

    await reply(
      `📋 *Warnings for @${numberFromJid(target)}*\n\n` +
      `⚠️ Total: ${warn.count}\n\n${reasonList}`,
      { mentions: [target] }
    );
  }
};
