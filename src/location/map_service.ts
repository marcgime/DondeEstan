import type { Coordinates, MemberLocationState } from './types';

// Tipado seguro para la API global de Google Maps
interface GoogleMapsGlobal {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
    LatLngBounds: new () => GoogleLatLngBounds;
    marker?: {
      AdvancedMarkerElement?: new (options: Record<string, unknown>) => unknown;
    };
  };
}

interface GoogleMapInstance {
  setCenter: (coords: Coordinates) => void;
  setZoom: (zoom: number) => void;
  fitBounds: (bounds: GoogleLatLngBounds, padding?: number | Record<string, unknown>) => void;
}

interface GoogleLatLngBounds {
  extend: (coords: Coordinates) => void;
}

export class FamilyMapService {
  private mapInstance: GoogleMapInstance | null = null;
  private markersMap = new Map<string, HTMLElement>();

  constructor(
    private readonly container: HTMLElement,
    private readonly onSelectMember: (member: MemberLocationState) => void
  ) {}

  initialize(center: Coordinates = { lat: 41.3879, lng: 2.1699 }, zoom = 14): boolean {
    const gWindow = window as unknown as { google?: GoogleMapsGlobal };
    if (!gWindow.google?.maps) {
      return false;
    }

    const { maps } = gWindow.google;
    this.mapInstance = new maps.Map(this.container, {
      center,
      zoom,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });

    return true;
  }

  updateMembers(members: MemberLocationState[]): void {
    const gWindow = window as unknown as { google?: GoogleMapsGlobal };
    if (!this.mapInstance || !gWindow.google?.maps) {
      return;
    }

    const currentUids = new Set(members.map((m) => m.uid));

    // Limpiar marcadores de usuarios que ya no están
    for (const [uid, el] of this.markersMap.entries()) {
      if (!currentUids.has(uid)) {
        el.remove();
        this.markersMap.delete(uid);
      }
    }

    // Actualizar o crear marcadores para cada miembro
    for (const member of members) {
      if (!member.location) continue;

      let markerEl = this.markersMap.get(member.uid);
      if (!markerEl) {
        markerEl = this.createMarkerElement(member);
        this.markersMap.set(member.uid, markerEl);
        this.container.appendChild(markerEl);
      } else {
        this.updateMarkerElement(markerEl, member);
      }
    }
  }

  centerOn(coords: Coordinates, zoom = 16): void {
    if (this.mapInstance) {
      this.mapInstance.setCenter(coords);
      this.mapInstance.setZoom(zoom);
    }
  }

  fitBounds(coordsList: Coordinates[]): void {
    const gWindow = window as unknown as { google?: GoogleMapsGlobal };
    if (!this.mapInstance || !gWindow.google?.maps || coordsList.length === 0) {
      return;
    }

    if (coordsList.length === 1) {
      this.centerOn(coordsList[0], 15);
      return;
    }

    const bounds = new gWindow.google.maps.LatLngBounds();
    for (const c of coordsList) {
      bounds.extend(c);
    }

    this.mapInstance.fitBounds(bounds, { top: 60, bottom: 120, left: 40, right: 40 });
  }

  private createMarkerElement(member: MemberLocationState): HTMLElement {
    const el = document.createElement('div');
    el.className = 'absolute cursor-pointer transition-transform duration-300 hover:scale-110 active:scale-95 z-20';
    el.style.transform = 'translate(-50%, -50%)';
    this.updateMarkerElement(el, member);

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onSelectMember(member);
    });

    return el;
  }

  private updateMarkerElement(el: HTMLElement, member: MemberLocationState): void {
    const isLive = member.isLive;
    const initial = member.display_name.charAt(0).toUpperCase();

    el.innerHTML = `
      <div class="relative flex items-center justify-center">
        <!-- Pulsing Halo for Live Users -->
        ${
          isLive
            ? '<span class="absolute w-12 h-12 rounded-full bg-status-online/25 animate-ping"></span>'
            : ''
        }
        
        <!-- Outer Avatar Squircle / Circle -->
        <div class="relative w-11 h-11 rounded-full p-0.5 bg-surface-canvas shadow-card border-2 ${
          isLive ? 'border-status-online' : 'border-status-offline'
        }">
          <div class="w-full h-full rounded-full bg-brand-primary flex items-center justify-center text-brand-on-primary font-bold text-sm overflow-hidden">
            ${
              member.photo_url
                ? `<img src="${escapeHtml(member.photo_url)}" alt="${escapeHtml(
                    member.display_name
                  )}" class="w-full h-full object-cover" />`
                : initial
            }
          </div>
        </div>

        <!-- Name Label Pin -->
        <div class="absolute -bottom-5 whitespace-nowrap px-2 py-0.5 rounded-full bg-surface-canvas/90 backdrop-blur-sm border border-border-subtle shadow-sm text-[10px] font-bold text-text-primary">
          ${escapeHtml(member.display_name.split(' ')[0])}
        </div>
      </div>
    `;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

