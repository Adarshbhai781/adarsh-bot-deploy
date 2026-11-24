// ======================================
// GROUP EVENTS (welcome / goodbye / promote)
// ======================================

import { getGroup } from './store.js';
import { getGroupMetadata, clearGroupCache } from './groupHelper.js';
import { mentionTags, numberFromJid } from './jid.js';
import { sleep } from './util.js';

function fillTemplate(text, { names, groupName, desc, memberCount }) {
  return String(text)
    .replace(/@user(s)?/g, names)
    .replace(/@group/g, groupName)
    .replace(/@desc/g, desc || 'No description')
    .replace(/@count/g, String(memberCount));
}

export async function handleGroupParticipants(sock, update) {
  const { id, participants, action } = update || {};

  if (!id || !Array.isArray(participants) || !participants.length) return;

  if (!['add', 'remove', 'promote', 'demote'].includes(action)) return;

  clearGroupCache(id);

  const group = await getGroup(id);

  let metadata = null;

  try {
    metadata = await getGroupMetadata(sock, id, true);
  } catch {
    return;
  }

  const groupName = metadata?.subject || 'the group';
  const memberCount = metadata?.participants?.length || '?';
  const names = mentionTags(participants);
  const mentions = participants;

  const context = {
    names,
    groupName,
    memberCount,
    desc: (metadata?.desc || '').slice(0, 200)
  };

  await sleep(500); // let WhatsApp settle before sending

  try {
    if (action === 'add' && group.welcome !== false) {
      const fallback =
        `👋 Welcome ${names}!\n\n` +
        `You have joined *${groupName}*.\n` +
        `👥 Members: ${memberCount}\n\n` +
        'Enjoy your stay! 🎉';

      const text = group.welcomeText
        ? fillTemplate(group.welcomeText, context)
        : fallback;

      await sock.sendMessage(id, { text, mentions });
      return;
    }

    if (action === 'remove' && group.goodbye !== false) {
      const fallback =
        `😢 Goodbye ${names}!\n\n` +
        `They have left *${groupName}*.\n` +
        `👥 Members: ${memberCount}`;

      const text = group.goodbyeText
        ? fillTemplate(group.goodbyeText, context)
        : fallback;

      await sock.sendMessage(id, { text, mentions });
      return;
    }

    if (action === 'promote') {
      await sock.sendMessage(id, {
        text: `🎉 ${names} ${participants.length > 1 ? 'are' : 'is'} now a group *admin*!`,
        mentions
      });
      return;
    }

    if (action === 'demote') {
      await sock.sendMessage(id, {
        text: `⬇️ ${names} ${participants.length > 1 ? 'are' : 'is'} no longer a group admin.`,
        mentions
      });
    }
  } catch (error) {
    console.error('[bot] group event message error:', error.message);
  }
}

export { numberFromJid };
