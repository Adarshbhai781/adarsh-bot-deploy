// ======================================
// .resetwarn - clear warnings of a user
// ======================================

import { resolveTarget } from '../lib/groupHelper.js';
import { resetWarnings } from '../lib/store.js';
import { numberFromJid } from '../lib/jid.js';

export default {
  name: 'resetwarn',
  aliases: ['resetwarnings'],
  category: 'Group Admin',
  description: 'Clear all warnings of a member',
  usage: '.resetwarn @user',
  adminOnly: true,
  groupOnly: true,

  async execute(ctx) {
    const { msg, args, jid, reply } = ctx;

    const target = resolveTarget(msg, args);

    if (!target) {
      await reply('❌ Mention or reply to the user.\n\nExample: .resetwarn @user');
      return;
    }

    const cleared = await resetWarnings(jid, target);

    await reply(
      cleared
        ? `🧹 All warnings cleared for @${numberFromJid(target)}.`
        : `ℹ️ @${numberFromJid(target)} has no warnings to clear.`,
      { mentions: [target] }
    );
  }
};
