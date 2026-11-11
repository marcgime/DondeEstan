import { describe, it, expect } from 'vitest';
import { calculateDistanceMeters, formatRelativeTime } from '@/location/geo_utils';
import { LocationThrottleService } from '@/location/throttle';

describe('Geo Utilities', () => {
  it('calculates zero distance for identical points', () => {
    const p1 = { lat: 41.3879, lng: 2.1699 };
    expect(calculateDistanceMeters(p1, p1)).toBe(0);
  });

  it('calculates accurate distance between known coordinates', () => {
    // Barcelona (Plaça Catalunya) a Sagrada Família (~2.3 km)
    const bcnCenter = { lat: 41.3870, lng: 2.1700 };
    const sagradaFam = { lat: 41.4036, lng: 2.1744 };
    const distance = calculateDistanceMeters(bcnCenter, sagradaFam);
    expect(distance).toBeGreaterThan(1800);
    expect(distance).toBeLessThan(2300);
  });

  it('formats relative timestamps in clean Spanish', () => {
    const now = 1700000000000;
    expect(formatRelativeTime(now - 5000, now)).toBe('Ahora mismo');
    expect(formatRelativeTime(now - 30000, now)).toBe('hace 30 s');
    expect(formatRelativeTime(now - 120000, now)).toBe('hace 2 min');
    expect(formatRelativeTime(now - 7200000, now)).toBe('hace 2 h');
  });
});

describe('LocationThrottleService (Firebase Spark Quota Protection)', () => {
  const service = new LocationThrottleService();
  const baseCoords = { lat: 41.5632, lng: 2.0089 };

  it('always permits emission on first report (lastReport is null)', () => {
    expect(service.shouldEmit(null, baseCoords, 1000000)).toBe(true);
  });

  it('rejects emission if less than 30s have elapsed even with displacement', () => {
    const lastReport = { coords: baseCoords, timestamp: 1000000 };
    // Mismo punto pero 25s después (~50m de desplazamiento)
    const movedCoords = { lat: 41.5636, lng: 2.0089 };
    expect(service.shouldEmit(lastReport, movedCoords, 1000000 + 25000)).toBe(false);
  });

  it('permits emission if 30s elapsed AND moved >= 15m', () => {
    const lastReport = { coords: baseCoords, timestamp: 1000000 };
    // Desplazamiento aproximado de ~50 metros
    const movedCoords = { lat: 41.5637, lng: 2.0089 };
    expect(service.shouldEmit(lastReport, movedCoords, 1000000 + 31000)).toBe(true);
  });

  it('rejects emission if 30s elapsed but moved < 15m', () => {
    const lastReport = { coords: baseCoords, timestamp: 1000000 };
    // Desplazamiento mínimo (<5 metros)
    const slightlyMoved = { lat: 41.5632001, lng: 2.0089001 };
    expect(service.shouldEmit(lastReport, slightlyMoved, 1000000 + 40000)).toBe(false);
  });

  it('permits emission on heartbeat (120s) even with zero movement', () => {
    const lastReport = { coords: baseCoords, timestamp: 1000000 };
    expect(service.shouldEmit(lastReport, baseCoords, 1000000 + 120001)).toBe(true);
  });
});
