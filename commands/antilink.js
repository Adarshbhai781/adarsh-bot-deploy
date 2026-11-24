// ======================================
// .antilink - block link senders
// ======================================

import { saveGroup, getGroup } from '../lib/store.js';

export default {
  name: 'antilink',
  category: 'Group Admin',
  description: 'Turn link protection on/off (auto warn + remove)',
  usage: '.antilink on | .antilink off',
  adminOnly: true,
  groupOnly: true,

  async execute(ctx) {
    const { jid, args, reply } = ctx;
    const value = String(args[0] || '').toLowerCase();

    if (!['on', 'off'].includes(value)) {
      const group = await getGroup(jid);
      await reply(
        `🔗 *ANTILINK*\n\n` +
        `Current status: *${group.antilink ? 'ON ✅' : 'OFF ❌'}*\n\n` +
        '• .antilink on — links from members get deleted, user gets warnings\n' +
        '• .antilink off — everyone can send links\n\n' +
        '⚠️ 3 warnings = automatic removal from the group.\n' +
        '💡 Group admins can always send links.'
      );
      return;
    }

    await saveGroup(jid, { antilink: value === 'on' });

    await reply(
      value === 'on'
        ? '🔗 *Antilink: ON* ✅\n\nMembers who send links will get warnings and can be removed after 3 warnings.'
        : '🔗 *Antilink: OFF* ❌\n\nEveryone can send links now.'
    );
  }
};
