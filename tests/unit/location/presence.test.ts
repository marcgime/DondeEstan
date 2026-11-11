import { describe, it, expect } from 'vitest';
import { isUserLive } from '@/location/presence';

describe('Presence Logic (Abrupt Disconnect Detection)', () => {
  const now = 1700000000000;

  it('marks user as live if status is online and updated within 90 seconds', () => {
    expect(isUserLive('online', now - 10000, now)).toBe(true);
    expect(isUserLive('online', now - 89000, now)).toBe(true);
  });

  it('marks user as not live if status is online but updated > 90 seconds ago (abrupt disconnect)', () => {
    expect(isUserLive('online', now - 91000, now)).toBe(false);
    expect(isUserLive('online', now - 200000, now)).toBe(false);
  });

  it('marks user as not live if status is offline regardless of timestamp', () => {
    expect(isUserLive('offline', now - 5000, now)).toBe(false);
  });

  it('handles invalid timestamps safely', () => {
    expect(isUserLive('online', 0, now)).toBe(false);
    expect(isUserLive('online', -1, now)).toBe(false);
  });
});

