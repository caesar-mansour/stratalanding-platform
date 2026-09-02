// Shared admin status state
// Both /api/admin/status and /api/messages use this module

let adminLastSeen: number | null = null;
let adminStatus: 'visible' | 'busy' | 'hidden' = 'visible';

export function getAdminLastSeen() {
  return adminLastSeen;
}

export function setAdminLastSeen(time: number) {
  adminLastSeen = time;
}

export function getAdminStatus() {
  return adminStatus;
}

export function setAdminStatus(status: 'visible' | 'busy' | 'hidden') {
  adminStatus = status;
}

/** Returns the client-facing status: online, busy, or offline */
export function getClientFacingStatus(): 'online' | 'busy' | 'offline' {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  const isActive = adminLastSeen && adminLastSeen > fiveMinutesAgo;

  if (!isActive) return 'offline';
  if (adminStatus === 'visible') return 'online';
  if (adminStatus === 'busy') return 'busy';
  return 'offline'; // hidden
}
