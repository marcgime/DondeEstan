import type { Coordinates } from './types';

const EARTH_RADIUS_METERS = 6371000;

export function calculateDistanceMeters(c1: Coordinates, c2: Coordinates): number {
  if (c1.lat === c2.lat && c1.lng === c2.lng) {
    return 0;
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(c2.lat - c1.lat);
  const dLng = toRad(c2.lng - c1.lng);
  const lat1 = toRad(c1.lat);
  const lat2 = toRad(c2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

export function formatRelativeTime(timestampMs: number, nowMs: number = Date.now()): string {
  if (!timestampMs || timestampMs <= 0) {
    return 'Desconocido';
  }

  const diffSec = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));

  if (diffSec < 10) {
    return 'Ahora mismo';
  }
  if (diffSec < 60) {
    return `hace ${diffSec} s`;
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `hace ${diffMin} min`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `hace ${diffHours} h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

