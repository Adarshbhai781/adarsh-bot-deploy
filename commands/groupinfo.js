// ======================================
// .groupinfo - group details
// ======================================

import { getGroup } from '../lib/store.js';
import { groupAdmins } from '../lib/groupHelper.js';
import { numberFromJid, mentionTags } from '../lib/jid.js';
import { currentTimeIST, trimText } from '../lib/util.js';

export default {
  name: 'groupinfo',
  aliases: ['gcinfo', 'group'],
  category: 'Group Admin',
  description: 'Show full group information',
  usage: '.groupinfo',
  public: true,
  groupOnly: true,

  async execute(ctx) {
    const { jid, metadata, reply } = ctx;

    if (!metadata) {
      await reply('❌ Could not load group info. Try again.');
      return;
    }

    const group = await getGroup(jid);
    const admins = groupAdmins(metadata);

    const created = metadata.creation
      ? currentTimeIST(new Date(metadata.creation * 1000))
      : 'Unknown';

    const lines = [
      '👥 *GROUP INFO*',
      '',
      `📌 Name: ${metadata.subject || 'Unknown'}`,
      `🆔 JID: ${jid}`,
      `📅 Created: ${created}`,
      `👤 Owner: ${metadata.owner ? `+${numberFromJid(metadata.owner)}` : '(hidden)'}`,
      `👥 Members: ${metadata.participants?.length || '?'}`,
      `🛡 Admins: ${admins.length}`,
      `🛡 Admin list: ${admins.length ? mentionTags(admins) : '—'}`,
      '',
      `🔐 Message permission: ${metadata.announce ? 'Only admins' : 'Everyone'}`,
      `🔒 Info edit: ${metadata.locked ? 'Only admins' : 'Everyone'}`,
      `🔗 Antilink: ${group.antilink ? 'ON ✅' : 'OFF ❌'}`,
      `👋 Welcome: ${group.welcome ? 'ON ✅' : 'OFF ❌'}`,
      `😢 Goodbye: ${group.goodbye ? 'ON ✅' : 'OFF ❌'}`,
      '',
      `📝 Description:\n${trimText(metadata.desc || 'No description', 400)}`
    ];

    await reply(lines.join('\n'), {
      mentions: admins
    });
  }
};
