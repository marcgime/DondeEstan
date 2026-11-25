import type { UiScaleLevel } from '../ui/theme/ui_scale';

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: string;
}

export interface ProfileUpdatePayload {
  displayName?: string;
  photoUrl?: string;
  uiScale?: UiScaleLevel;
  chatNotificationsEnabled?: boolean;
}

