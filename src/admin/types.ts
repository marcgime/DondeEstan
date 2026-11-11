export interface SystemConfig {
  registration_open: boolean;
  max_members: number;
}

export interface WhitelistRecord {
  email: string;
  status: 'preapproved' | 'pending_approval' | 'active';
  added_at: number;
  uid?: string | null;
  added_by?: string | null;
}

