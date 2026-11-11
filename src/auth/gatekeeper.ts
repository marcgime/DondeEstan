import type { UserProfile } from './types';

export function isUserApproved(user: UserProfile | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.status === 'active' || user.status === 'online' || user.status === 'offline';
}

export function shouldShowGatekeeper(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.status === 'pending_approval';
}

export function isUserRejected(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.status === 'rejected';
}

