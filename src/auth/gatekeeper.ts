import type { UserProfile } from './types';

export function isUserWaitingGroup(user: UserProfile | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return false;
  const isApproved = user.status === 'active' || user.status === 'online' || user.status === 'offline';
  if (!isApproved) return false;
  return !user.groupIds || user.groupIds.length === 0;
}

export function isUserApproved(user: UserProfile | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const isApproved = user.status === 'active' || user.status === 'online' || user.status === 'offline';
  if (!isApproved) return false;
  return Array.isArray(user.groupIds) && user.groupIds.length > 0;
}

export function shouldShowGatekeeper(user: UserProfile | null): boolean {
  if (!user) return false;
  if (user.status === 'pending_approval' || user.status === 'unverified_email') return true;
  return isUserWaitingGroup(user);
}

export function isUserRejected(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.status === 'rejected';
}
