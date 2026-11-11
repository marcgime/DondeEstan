import type { Coordinates, LocationReport, ThrottleConfig } from './types';
import { calculateDistanceMeters } from './geo_utils';

export const DEFAULT_THROTTLE_CONFIG: ThrottleConfig = {
  minIntervalMs: 30000,       // 30 segundos
  minDistanceMeters: 15,      // 15 metros
  heartbeatIntervalMs: 120000 // 120 segundos (latido de presencia)
};

export class LocationThrottleService {
  constructor(private readonly config: ThrottleConfig = DEFAULT_THROTTLE_CONFIG) {}

  shouldEmit(
    lastReport: LocationReport | null,
    nextCoords: Coordinates,
    nowMs: number = Date.now()
  ): boolean {
    // 1. Primer reporte de sesión: emitir de inmediato
    if (!lastReport) {
      return true;
    }

    const deltaMs = nowMs - lastReport.timestamp;

    // 2. Latido de presencia (heartbeat de inactividad de movimiento): emitir tras 120s
    if (deltaMs >= this.config.heartbeatIntervalMs) {
      return true;
    }

    // 3. Estrangulamiento temporal estricto: rechazar si no han transcurrido 30s
    if (deltaMs < this.config.minIntervalMs) {
      return false;
    }

    // 4. Estrangulamiento espacial: comprobar si el desplazamiento supera el umbral (15m)
    const distanceMeters = calculateDistanceMeters(lastReport.coords, nextCoords);
    return distanceMeters >= this.config.minDistanceMeters;
  }
}

