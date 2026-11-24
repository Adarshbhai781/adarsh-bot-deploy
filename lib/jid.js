// ======================================
// JID / NUMBER HELPERS
// ======================================

export function digits(value = '') {
  return String(value).replace(/\D/g, '');
}

export function numberFromJid(jid = '') {
  return digits(String(jid).split('@')[0].split(':')[0]);
}

export function phoneJid(number = '') {
  return `${numberFromJid(number)}@s.whatsapp.net`;
}

export function isGroupJid(jid = '') {
  return String(jid).endsWith('@g.us');
}

export function mentionTag(jid) {
  return `@${numberFromJid(jid)}`;
}

export function mentionTags(jids = []) {
  return jids.map(j => mentionTag(j)).join(' ');
}
