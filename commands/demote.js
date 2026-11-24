// ======================================
// .demote - remove admin rights
// ======================================

import { resolveTarget, findParticipant, isParticipantAdmin } from '../lib/groupHelper.js';
import { numberFromJid } from '../lib/jid.js';

export default {
  name: 'demote',
  category: 'Group Admin',
  description: 'Remove group admin rights from a member',
  usage: '.demote @user (or reply to their message)',
  adminOnly: true,
  groupOnly: true,

  async execute(ctx) {
    const { sock, msg, jid, args, metadata, botAdmin, reply } = ctx;

    if (!botAdmin) {
      await reply('🛡️ I need *admin rights* to demote members. Please make me a group admin first.');
      return;
    }

    const target = resolveTarget(msg, args);

    if (!target) {
      await reply('❌ Mention or reply to the user you want to demote.\n\nExample: .demote @user');
      return;
    }

    if (!isParticipantAdmin(metadata, target)) {
      await reply('ℹ️ That user is not a group admin.');
      return;
    }

    const participant = findParticipant(metadata, target);
    const useJid = participant?.id || target;

    try {
      await sock.groupParticipantsUpdate(jid, [useJid], 'demote');
      await reply(`⬇️ @${numberFromJid(useJid)} is no longer a group admin.`, {
        mentions: [useJid]
      });
    } catch (error) {
      await reply(`❌ Demote failed: ${error.message}`);
    }
  }
};
