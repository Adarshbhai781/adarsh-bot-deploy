// ======================================
// .tagall - mention every member
// ======================================

import { mentionTags } from '../lib/jid.js';

export default {
  name: 'tagall',
  aliases: ['tag', 'everyone'],
  category: 'Group Admin',
  description: 'Mention all group members',
  usage: '.tagall <message> (message optional)',
  adminOnly: true,
  groupOnly: true,

  async execute(ctx) {
    const { metadata, text, reply } = ctx;

    const participants = (metadata?.participants || [])
      .map(p => p.id)
      .filter(Boolean);

    if (!participants.length) {
      await reply('❌ Could not load the member list. Try again.');
      return;
    }

    const lines = [
      '📢 *ATTENTION EVERYONE!*',
      '',
      text || 'Please check the group.',
      '',
      mentionTags(participants)
    ];

    await reply(lines.join('\n'), { mentions: participants });
  }
};
