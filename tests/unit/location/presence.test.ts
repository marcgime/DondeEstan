import { describe, it, expect, vi } from 'vitest';
import { isUserLive } from '@/location/presence';
import { FamilyMapService } from '@/location/map_service';
import type { MemberLocationState } from '@/location/types';

describe('Presence Logic (Abrupt Disconnect Detection)', () => {
  const now = 1700000000000;

  it('marks user as live if status is online and updated within 90 seconds', () => {
    expect(isUserLive('online', now - 10000, now)).toBe(true);
    expect(isUserLive('online', now - 89000, now)).toBe(true);
  });

  it('marks user as not live if status is online but updated > 90 seconds ago (abrupt disconnect)', () => {
    expect(isUserLive('online', now - 91000, now)).toBe(false);
    expect(isUserLive('online', now - 200000, now)).toBe(false);
  });

  it('marks user as not live if status is offline regardless of timestamp', () => {
    expect(isUserLive('offline', now - 5000, now)).toBe(false);
  });

  it('handles invalid timestamps safely', () => {
    expect(isUserLive('online', 0, now)).toBe(false);
    expect(isUserLive('online', -1, now)).toBe(false);
  });
});

describe('Map Marker Beacon Styling (Online vs Offline)', () => {
  it('renders name badge in online color without ping animation when live, and default canvas style when offline', () => {
    const appendedChildren: HTMLElement[] = [];
    const mockContainer = {
      appendChild: vi.fn((el: HTMLElement) => appendedChildren.push(el)),
    } as unknown as HTMLElement;

    const gWindow = globalThis as unknown as {
      window?: unknown;
      document?: unknown;
    };
    const prevWindow = gWindow.window;
    const prevDocument = gWindow.document;

    gWindow.window = {
      google: {
        maps: {
          Map: class {
            setCenter() {}
            setZoom() {}
            getZoom() {
              return 14;
            }
            fitBounds() {}
          },
        },
      },
    };
    gWindow.document = {
      createElement: () => ({
        className: '',
        style: {},
        innerHTML: '',
        textContent: '',
        addEventListener: vi.fn(),
        remove: vi.fn(),
      }),
    };

    try {
      const mapService = new FamilyMapService(mockContainer, vi.fn());
      expect(mapService.initialize()).toBe(true);

      const liveMember: MemberLocationState = {
        uid: 'u-live',
        display_name: 'Marc',
        email: 'marc@example.com',
        role: 'admin',
        status: 'online',
        isLive: true,
        location: { lat: 41.38, lng: 2.16, updated_at: 1000 },
        relativeTimeText: 'En línea ahora',
      };

      const offlineMember: MemberLocationState = {
        uid: 'u-off',
        display_name: 'Ana',
        email: 'ana@example.com',
        role: 'member',
        status: 'offline',
        isLive: false,
        location: { lat: 41.39, lng: 2.17, updated_at: 1000 },
        relativeTimeText: 'Hace 5 min',
      };

      mapService.updateMembers([liveMember, offlineMember]);

      expect(appendedChildren).toHaveLength(2);
      const liveHtml = appendedChildren[0].innerHTML;
      const offlineHtml = appendedChildren[1].innerHTML;

      // Sin vibración / halo animate-ping en ningún estado
      expect(liveHtml).not.toContain('animate-ping');
      expect(offlineHtml).not.toContain('animate-ping');

      // En línea: bocadillo del nombre cambia de color a bg-status-online
      expect(liveHtml).toContain('bg-status-online text-text-on-accent border-status-online');

      // En reposo: bocadillo mantiene el estilo neutro original
      expect(offlineHtml).toContain('bg-surface-canvas/90 backdrop-blur-sm border-border-subtle text-text-primary');
    } finally {
      gWindow.window = prevWindow;
      gWindow.document = prevDocument;
    }
  });
});


