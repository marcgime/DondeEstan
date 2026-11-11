export type UserRole = 'admin' | 'member';

export type UserStatus = 'pending_approval' | 'active' | 'rejected' | 'online' | 'offline';

export interface UserLocation {
  lat: number;
  lng: number;
  updated_at: unknown;
}

export interface UserProfile {
  uid: string;
  email: string;
  display_name: string;
  photo_url?: string;
  role: UserRole;
  status: UserStatus;
  location?: UserLocation;
  created_at?: unknown;
  updated_at?: unknown;
}

export type WhitelistStatus = 'preapproved' | 'pending_approval' | 'active' | 'not_found';

export interface WhitelistEntry {
  email: string;
  status: WhitelistStatus;
  uid: string | null;
  added_at?: unknown;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  entry?: WhitelistEntry;
}

export interface AuthSession {
  user: UserProfile;
  isApproved: boolean;
}

