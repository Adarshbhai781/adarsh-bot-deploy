// ======================================
// ANTI-SPAM (flood guard + command cooldown)
// ======================================

const COOLDOWN_MS = 3000;    // gap required between commands
const FLOOD_LIMIT = 8;       // messages in window before mute
const FLOOD_WINDOW = 10000;  // 10 seconds
const MUTE_MS = 30000;       // silence duration

const lastCommand = new Map(); // sender -> timestamp
const msgTimes = new Map();    // sender -> [timestamps]
const mutedUntil = new Map();  // sender -> timestamp

export function isMuted(sender) {
  const until = mutedUntil.get(sender) || 0;
  return Date.now() < until;
}

// Call for every incoming non-owner message.
// Returns: 'ok' | 'muted' | 'warned'
export function checkMessage(sender) {
  if (isMuted(sender)) return 'muted';

  const now = Date.now();
  const recent = (msgTimes.get(sender) || [])
    .filter(ts => now - ts < FLOOD_WINDOW);

  recent.push(now);
  msgTimes.set(sender, recent);

  if (recent.length > FLOOD_LIMIT) {
    mutedUntil.set(sender, now + MUTE_MS);
    msgTimes.delete(sender);
    return 'warned';
  }

  return 'ok';
}

// Command cooldown. Returns true when the command may run.
export function checkCommand(sender) {
  const now = Date.now();
  const last = lastCommand.get(sender) || 0;

  if (now - last < COOLDOWN_MS) return false;

  lastCommand.set(sender, now);
  return true;
}

export function resetUser(sender) {
  lastCommand.delete(sender);
  msgTimes.delete(sender);
  mutedUntil.delete(sender);
}
