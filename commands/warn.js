// ======================================
// .warn - warn a member
// ======================================

import { WARN_LIMIT } from '../config.js';
import { resolveTarget, isParticipantAdmin } from '../lib/groupHelper.js';
import { addWarning, resetWarnings } from '../lib/store.js';
import { numberFromJid } from '../lib/jid.js';

export default {
  name: 'warn',
  category: 'Group Admin',
  description: 'Warn a member (auto-remove after limit)',
  usage: '.warn @user <reason>',
  adminOnly: true,
  groupOnly: true,

  async execute(ctx) {
    const { sock, msg, jid, args, metadata, botAdmin, reply, text } = ctx;

    const target = resolveTarget(msg, args);

    if (!target) {
      await reply('❌ Mention or reply to the user you want to warn.\n\nExample: .warn @user spamming');
      return;
    }

    if (isParticipantAdmin(metadata, target) || numberFromJid(target) === numberFromJid(sock.user?.id || '')) {
      await reply('🛡️ I cannot warn admins or myself.');
      return;
    }

    const reason = text.replace(/@[\d]+/g, '').trim() || 'No reason given';

    const warn = await addWarning(jid, target, reason);
    const userTag = `@${numberFromJid(target)}`;

    if (warn.count >= WARN_LIMIT) {
      await resetWarnings(jid, target);

      if (botAdmin) {
        try {
          await sock.groupParticipantsUpdate(jid, [target], 'remove');
          await reply(
            `🚫 ${userTag} was removed from the group after ${WARN_LIMIT} warnings.\n\n📋 Last reason: ${reason}`,
            { mentions: [target] }
          );
        } catch (error) {
          await reply(
            `⚠️ ${userTag} reached the warning limit but I could not remove them.\n❌ ${error.message}`,
            { mentions: [target] }
          );
        }
      } else {
        await reply(
          `⚠️ ${userTag} reached the warning limit, but I need *admin rights* to remove them.\n\n📋 Reason: ${reason}`,
          { mentions: [target] }
        );
      }

      return;
    }

    const reasonList = warn.reasons
      .map((r, i) => `${i + 1}. ${r.reason}`)
      .join('\n');

    await reply(
      `⚠️ *Warning ${warn.count}/${WARN_LIMIT}*\n\n` +
      `👤 User: ${userTag}\n` +
      `📋 Reason: ${reason}\n\n` +
      `📌 All warnings:\n${reasonList}\n\n` +
      `⏳ At ${WARN_LIMIT} warnings the user is removed from the group.`,
      { mentions: [target] }
    );
  }
};
