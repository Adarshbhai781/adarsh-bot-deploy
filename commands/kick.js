// ======================================
// .kick - remove a group member
// ======================================

import { resolveTarget, findParticipant, isParticipantAdmin } from '../lib/groupHelper.js';
import { numberFromJid } from '../lib/jid.js';

export default {
  name: 'kick',
  aliases: ['remove'],
  category: 'Group Admin',
  description: 'Remove a member from the group',
  usage: '.kick @user (or reply to their message)',
  adminOnly: true,
  groupOnly: true,

  async execute(ctx) {
    const { sock, msg, jid, args, metadata, botAdmin, reply } = ctx;

    if (!botAdmin) {
      await reply('🛡️ I need *admin rights* to remove members. Please make me a group admin first.');
      return;
    }

    const target = resolveTarget(msg, args);

    if (!target) {
      await reply('❌ Mention or reply to the user you want to remove.\n\nExample: .kick @user');
      return;
    }

    if (numberFromJid(target) === numberFromJid(sock.user?.id || '')) {
      await reply('😅 I cannot remove myself!');
      return;
    }

    if (isParticipantAdmin(metadata, target)) {
      await reply('🛡️ That user is a group admin. I cannot remove admins.');
      return;
    }

    const participant = findParticipant(metadata, target);
    const useJid = participant?.id || target;

    try {
      const result = await sock.groupParticipantsUpdate(jid, [useJid], 'remove');
      const status = Array.isArray(result) ? result[0]?.status : null;

      if (!status || status === 200) {
        await reply(`✅ Removed @${numberFromJid(useJid)} from the group.`, {
          mentions: [useJid]
        });
      } else {
        await reply(`❌ Could not remove that user (WhatsApp code ${status}).`);
      }
    } catch (error) {
      await reply(`❌ Kick failed: ${error.message}`);
    }
  }
};
