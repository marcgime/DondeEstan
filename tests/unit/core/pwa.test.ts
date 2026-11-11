import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isIosDevice, isStandaloneMode, dismissIosInstallPrompt } from '../../../src/core/pwa';

describe('PWA Utilities', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
    });
  });

  it('detecta correctamente dispositivos iOS por User Agent', () => {
    const iphoneUA =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const androidUA =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

    expect(isIosDevice(iphoneUA)).toBe(true);
    expect(isIosDevice(androidUA)).toBe(false);
  });

  it('evalúa correctamente el modo standalone', () => {
    expect(typeof isStandaloneMode()).toBe('boolean');
  });

  it('gestiona la desestimación del prompt de instalación en iOS', () => {
    expect(localStorage.getItem('dondeestan_ios_pwa_dismissed')).toBeNull();
    dismissIosInstallPrompt();
    expect(localStorage.getItem('dondeestan_ios_pwa_dismissed')).toBe('true');
  });
});

