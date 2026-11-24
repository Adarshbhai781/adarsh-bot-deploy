// ======================================
// .promote - make a member an admin
// ======================================

import { resolveTarget, findParticipant, isParticipantAdmin } from '../lib/groupHelper.js';
import { numberFromJid } from '../lib/jid.js';

export default {
  name: 'promote',
  category: 'Group Admin',
  description: 'Make a member a group admin',
  usage: '.promote @user (or reply to their message)',
  adminOnly: true,
  groupOnly: true,

  async execute(ctx) {
    const { sock, msg, jid, args, metadata, botAdmin, reply } = ctx;

    if (!botAdmin) {
      await reply('🛡️ I need *admin rights* to promote members. Please make me a group admin first.');
      return;
    }

    const target = resolveTarget(msg, args);

    if (!target) {
      await reply('❌ Mention or reply to the user you want to promote.\n\nExample: .promote @user');
      return;
    }

    if (isParticipantAdmin(metadata, target)) {
      await reply('ℹ️ That user is already a group admin.');
      return;
    }

    const participant = findParticipant(metadata, target);
    const useJid = participant?.id || target;

    try {
      await sock.groupParticipantsUpdate(jid, [useJid], 'promote');
      await reply(`🎉 @${numberFromJid(useJid)} is now a group admin!`, {
        mentions: [useJid]
      });
    } catch (error) {
      await reply(`❌ Promote failed: ${error.message}`);
    }
  }
};
