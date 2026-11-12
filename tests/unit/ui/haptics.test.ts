import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isHapticsSupported, triggerHaptic } from '../../../src/ui/utils/haptics';

describe('Haptics Utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detecta correctamente si navigator.vibrate está disponible', () => {
    expect(typeof isHapticsSupported()).toBe('boolean');
  });

  it('activa navigator.vibrate con los patrones correspondientes cuando está soportado', () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { vibrate: vibrateMock });

    expect(triggerHaptic('light')).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith(12);

    expect(triggerHaptic('medium')).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith(25);

    expect(triggerHaptic('success')).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith([15, 40, 20]);
  });

  it('devuelve false de forma segura si no está soportado', () => {
    vi.stubGlobal('navigator', {});
    expect(triggerHaptic('light')).toBe(false);
  });
});

