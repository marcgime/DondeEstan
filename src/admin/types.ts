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

export interface Group {
  id: string;
  name: string;
  created_at: number;
  created_by: string;
  guia_enabled?: boolean;
}


