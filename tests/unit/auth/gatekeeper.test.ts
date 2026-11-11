import { describe, it, expect } from 'vitest';
import { isUserApproved, shouldShowGatekeeper, isUserRejected } from '@/auth/gatekeeper';
import type { UserProfile } from '@/auth/types';

describe('Gatekeeper Guard Logic', () => {
  const baseProfile: UserProfile = {
    uid: 'user-123',
    email: 'hijo@familia.es',
    display_name: 'Familiar',
    role: 'member',
    status: 'pending_approval',
  };

  it('blocks pending_approval members from entering main app', () => {
    expect(isUserApproved(baseProfile)).toBe(false);
    expect(shouldShowGatekeeper(baseProfile)).toBe(true);
    expect(isUserRejected(baseProfile)).toBe(false);
  });

  it('allows active members to pass the gatekeeper', () => {
    const activeProfile: UserProfile = { ...baseProfile, status: 'active' };
    expect(isUserApproved(activeProfile)).toBe(true);
    expect(shouldShowGatekeeper(activeProfile)).toBe(false);
  });

  it('allows online and offline status for approved members', () => {
    expect(isUserApproved({ ...baseProfile, status: 'online' })).toBe(true);
    expect(isUserApproved({ ...baseProfile, status: 'offline' })).toBe(true);
  });

  it('always allows admin role regardless of explicit status string', () => {
    const adminProfile: UserProfile = {
      ...baseProfile,
      role: 'admin',
      status: 'pending_approval',
    };
    expect(isUserApproved(adminProfile)).toBe(true);
  });

  it('correctly flags rejected members', () => {
    const rejectedProfile: UserProfile = { ...baseProfile, status: 'rejected' };
    expect(isUserApproved(rejectedProfile)).toBe(false);
    expect(shouldShowGatekeeper(rejectedProfile)).toBe(false);
    expect(isUserRejected(rejectedProfile)).toBe(true);
  });

  it('handles null profile safely', () => {
    expect(isUserApproved(null)).toBe(false);
    expect(shouldShowGatekeeper(null)).toBe(false);
    expect(isUserRejected(null)).toBe(false);
  });
});

