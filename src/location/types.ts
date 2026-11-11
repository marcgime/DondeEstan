export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationReport {
  coords: Coordinates;
  timestamp: number;
  accuracy?: number;
}

export interface ThrottleConfig {
  minIntervalMs: number;       // 30.000 ms (30 s)
  minDistanceMeters: number;   // 15 m
  heartbeatIntervalMs: number; // 120.000 ms (2 min)
}

export interface MemberLocationState {
  uid: string;
  display_name: string;
  email: string;
  photo_url?: string;
  role: 'admin' | 'member';
  status: 'online' | 'offline';
  isLive: boolean; // true si status == 'online' y updated_at <= 90 s
  location?: {
    lat: number;
    lng: number;
    updated_at: number;
  };
  relativeTimeText: string;
}

