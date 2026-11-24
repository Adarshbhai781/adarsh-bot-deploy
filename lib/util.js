// ======================================
// GENERAL UTILITIES
// ======================================

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function fmtDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!parts.length) parts.push(`${s}s`);

  return parts.join(' ');
}

// Remove heavy markdown symbols so replies look clean in WhatsApp
export function cleanMarkdown(text) {
  return String(text || '')
    .replace(/\*\*/g, '*')
    .replace(/__+/g, '_')
    .replace(/^#{1,6}\s*/gm, '')
    .trim();
}

export function trimText(text, max = 3000) {
  const value = String(text || '');
  if (value.length <= max) return value;
  return value.slice(0, max) + '\n\n...';
}

export function currentTimeIST(date = new Date()) {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: true
  });
}
