const ABRUPT_DISCONNECT_THRESHOLD_MS = 90000; // 90 segundos

export function isUserLive(
  status: string,
  updatedAtMs: number,
  nowMs: number = Date.now()
): boolean {
  if (status !== 'online') {
    return false;
  }

  if (!updatedAtMs || updatedAtMs <= 0) {
    return false;
  }

  return nowMs - updatedAtMs <= ABRUPT_DISCONNECT_THRESHOLD_MS;
}
