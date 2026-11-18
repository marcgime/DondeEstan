import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isIosDevice, isStandaloneMode, dismissIosInstallPrompt } from '../../../src/core/pwa';
import {
  applyUiScale,
  getStoredUiScale,
  getUiScalePercentage,
  initUiScale,
  isValidUiScale,
  UI_SCALE_STORAGE_KEY,
} from '../../../src/ui/theme/ui_scale';

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

  it('aplica por defecto el zoom ligero (108%) y permite cambiar la escala de UI', () => {
    expect(getStoredUiScale()).toBe('default');
    expect(getUiScalePercentage('default')).toBe('108%');
    expect(initUiScale()).toBe('default');

    expect(applyUiScale('comfortable')).toBe('comfortable');
    expect(localStorage.getItem(UI_SCALE_STORAGE_KEY)).toBe('comfortable');
    expect(getStoredUiScale()).toBe('comfortable');
    expect(getUiScalePercentage('comfortable')).toBe('115%');

    expect(isValidUiScale('large')).toBe(true);
    expect(isValidUiScale('invalid')).toBe(false);
  });

  it('configura DondeEstan como nombre por defecto y el logo oficial en manifest.json e index.html', () => {
    const manifestRaw = readFileSync(resolve(process.cwd(), 'public/manifest.json'), 'utf-8');
    const manifest = JSON.parse(manifestRaw) as {
      name: string;
      short_name: string;
      icons: Array<{ src: string; sizes: string; type: string }>;
    };

    expect(manifest.name).toBe('DondeEstan');
    expect(manifest.short_name).toBe('DondeEstan');
    expect(manifest.icons.some((i) => i.src === '/icons/icon-192.png')).toBe(true);
    expect(manifest.icons.some((i) => i.src === '/icons/icon-512.png')).toBe(true);

    const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8');
    expect(indexHtml).toContain('name="apple-mobile-web-app-title" content="DondeEstan"');
    expect(indexHtml).toContain('href="/favicon.png"');
    expect(indexHtml).toContain('href="/icons/apple-touch-icon.png"');
  });
});

