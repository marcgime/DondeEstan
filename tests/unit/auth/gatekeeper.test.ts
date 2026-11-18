import { describe, it, expect } from 'vitest';
import { isUserApproved, shouldShowGatekeeper, isUserRejected, isUserWaitingGroup } from '@/auth/gatekeeper';
import type { UserProfile } from '@/auth/types';

describe('Gatekeeper Guard Logic', () => {
  const baseProfile: UserProfile = {
    uid: 'user-123',
    email: 'hijo@familia.es',
    display_name: 'Familiar',
    role: 'member',
    status: 'pending_approval',
    groupIds: ['group-1'],
  };

  it('blocks pending_approval members from entering main app', () => {
    expect(isUserApproved(baseProfile)).toBe(false);
    expect(shouldShowGatekeeper(baseProfile)).toBe(true);
    expect(isUserRejected(baseProfile)).toBe(false);
  });

  it('blocks unverified_email members and shows gatekeeper', () => {
    const unverifiedProfile: UserProfile = { ...baseProfile, status: 'unverified_email' };
    expect(isUserApproved(unverifiedProfile)).toBe(false);
    expect(shouldShowGatekeeper(unverifiedProfile)).toBe(true);
  });

  it('allows active members with groups to pass the gatekeeper', () => {
    const activeProfile: UserProfile = { ...baseProfile, status: 'active', groupIds: ['grp-1'] };
    expect(isUserApproved(activeProfile)).toBe(true);
    expect(shouldShowGatekeeper(activeProfile)).toBe(false);
  });

  it('blocks active members without groups and shows gatekeeper waiting group assignment', () => {
    const noGroupProfile: UserProfile = { ...baseProfile, status: 'active', groupIds: [] };
    expect(isUserApproved(noGroupProfile)).toBe(false);
    expect(isUserWaitingGroup(noGroupProfile)).toBe(true);
    expect(shouldShowGatekeeper(noGroupProfile)).toBe(true);

    const undefinedGroupProfile: UserProfile = { ...baseProfile, status: 'active', groupIds: undefined };
    expect(isUserApproved(undefinedGroupProfile)).toBe(false);
    expect(isUserWaitingGroup(undefinedGroupProfile)).toBe(true);
    expect(shouldShowGatekeeper(undefinedGroupProfile)).toBe(true);
  });

  it('allows online and offline status for approved members with groups', () => {
    expect(isUserApproved({ ...baseProfile, status: 'online', groupIds: ['grp-1'] })).toBe(true);
    expect(isUserApproved({ ...baseProfile, status: 'offline', groupIds: ['grp-1'] })).toBe(true);
  });

  it('always allows admin role regardless of explicit status or groups', () => {
    const adminProfile: UserProfile = {
      ...baseProfile,
      role: 'admin',
      status: 'pending_approval',
      groupIds: [],
    };
    expect(isUserApproved(adminProfile)).toBe(true);
    expect(isUserWaitingGroup(adminProfile)).toBe(false);
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
    expect(isUserWaitingGroup(null)).toBe(false);
  });
});
