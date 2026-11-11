import { doc, updateDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { Coordinates, LocationReport } from './types';
import { LocationThrottleService } from './throttle';

export interface GeolocationTrackerOptions {
  uid: string;
  db: Firestore;
  onCoords?: (coords: Coordinates) => void;
  onError?: (error: GeolocationPositionError) => void;
}

export class GeolocationTracker {
  private watchId: number | null = null;
  private lastReport: LocationReport | null = null;
  private readonly throttle = new LocationThrottleService();
  private isRunning = false;

  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      this.pauseTracking();
    } else if (document.visibilityState === 'visible') {
      this.resumeTracking();
    }
  };

  private readonly handlePageHide = () => {
    this.emitStatus('offline');
  };

  constructor(private readonly options: GeolocationTrackerOptions) {}

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Escuchar ciclo de vida en iOS WebKit
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('pagehide', this.handlePageHide);

    this.resumeTracking();
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('pagehide', this.handlePageHide);

    this.pauseTracking();
    this.emitStatus('offline');
  }

  private resumeTracking(): void {
    if (!navigator.geolocation) {
      console.warn('Geolocation API no está disponible en este dispositivo.');
      return;
    }

    // Emitir presencia online de inmediato
    this.emitStatus('online');

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: Coordinates = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        if (this.options.onCoords) {
          this.options.onCoords(coords);
        }

        const now = Date.now();
        if (this.throttle.shouldEmit(this.lastReport, coords, now)) {
          this.emitLocation(coords, now, pos.coords.accuracy);
        }
      },
      (err) => {
        if (this.options.onError) {
          this.options.onError(err);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );
  }

  private pauseTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.emitStatus('offline');
  }

  private async emitStatus(status: 'online' | 'offline'): Promise<void> {
    try {
      const userRef = doc(this.options.db, 'users', this.options.uid);
      await updateDoc(userRef, {
        status,
        updated_at: serverTimestamp(),
      });
    } catch {
      // Ignorar fallos de red silenciosos en desconexión
    }
  }

  private async emitLocation(coords: Coordinates, nowMs: number, accuracy?: number): Promise<void> {
    this.lastReport = {
      coords,
      timestamp: nowMs,
      accuracy,
    };

    try {
      const userRef = doc(this.options.db, 'users', this.options.uid);
      await updateDoc(userRef, {
        location: {
          lat: coords.lat,
          lng: coords.lng,
          updated_at: serverTimestamp(),
        },
        status: 'online',
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error emitiendo ubicación:', err);
    }
  }
}

