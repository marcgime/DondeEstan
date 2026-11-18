import { doc, updateDoc, type Firestore } from 'firebase/firestore';
import type { ProfileUpdatePayload } from './types';
import type { UiScaleLevel } from '../ui/theme/ui_scale';

export class ProfileService {
  constructor(private readonly db: Firestore) {}

  async updateProfile(uid: string, payload: ProfileUpdatePayload): Promise<void> {
    const userRef = doc(this.db, 'users', uid);
    const updates: Record<string, unknown> = {
      updated_at: Date.now(),
    };

    if (payload.displayName !== undefined) {
      const trimmed = payload.displayName.trim();
      if (!trimmed) {
        throw new Error('El nombre no puede estar vacío.');
      }
      updates.display_name = trimmed;
    }

    if (payload.photoUrl !== undefined) {
      updates.photo_url = payload.photoUrl;
    }

    if (payload.uiScale !== undefined) {
      updates.ui_scale = payload.uiScale;
    }

    await updateDoc(userRef, updates);
  }

  async updateDisplayName(uid: string, displayName: string): Promise<void> {
    await this.updateProfile(uid, { displayName });
  }

  async updateAvatar(uid: string, photoUrl: string): Promise<void> {
    await this.updateProfile(uid, { photoUrl });
  }

  async updateUiScale(uid: string, uiScale: UiScaleLevel): Promise<void> {
    await this.updateProfile(uid, { uiScale });
  }
}

