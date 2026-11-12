/**
 * Utilidades de Feedback Háptico para PWA en dispositivos móviles.
 */

export type HapticPattern = 'light' | 'medium' | 'success' | 'warning' | 'error';

const PATTERN_DURATIONS: Record<HapticPattern, number | number[]> = {
  light: 12,
  medium: 25,
  success: [15, 40, 20],
  warning: [30, 50, 30],
  error: [50, 40, 50, 40, 80],
};

export function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function triggerHaptic(pattern: HapticPattern = 'light'): boolean {
  if (!isHapticsSupported()) {
    return false;
  }

  try {
    const duration = PATTERN_DURATIONS[pattern] || 15;
    return navigator.vibrate(duration);
  } catch (err) {
    console.warn('Error al activar feedback háptico:', err);
    return false;
  }
}

