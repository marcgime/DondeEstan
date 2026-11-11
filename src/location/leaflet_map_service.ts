import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordinates, MemberLocationState } from './types';

export class LeafletFamilyMapService {
  private map: L.Map | null = null;
  private markersMap = new Map<string, L.Marker>();

  constructor(
    private readonly container: HTMLElement,
    private readonly onSelectMember: (member: MemberLocationState) => void
  ) {}

  initialize(center: Coordinates = { lat: 41.3879, lng: 2.1699 }, zoom = 15): boolean {
    if (this.map) {
      this.map.remove();
    }

    this.container.innerHTML = '';
    const mapDiv = document.createElement('div');
    mapDiv.className = 'w-full h-full';
    this.container.appendChild(mapDiv);

    this.map = L.map(mapDiv, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    // OpenStreetMap standard tiles (completamente libre, sin API key requerida)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    return true;
  }

  updateMembers(members: MemberLocationState[]): void {
    if (!this.map) return;

    const currentUids = new Set(members.map((m) => m.uid));

    // Eliminar marcadores que ya no están
    for (const [uid, marker] of this.markersMap.entries()) {
      if (!currentUids.has(uid)) {
        marker.remove();
        this.markersMap.delete(uid);
      }
    }

    // Actualizar o añadir marcadores
    for (const member of members) {
      if (!member.location) continue;

      const { lat, lng } = member.location;
      const existing = this.markersMap.get(member.uid);

      if (existing) {
        existing.setLatLng([lat, lng]);
        existing.setIcon(this.createAvatarIcon(member));
      } else {
        const marker = L.marker([lat, lng], {
          icon: this.createAvatarIcon(member),
        }).addTo(this.map);

        marker.on('click', () => {
          this.onSelectMember(member);
        });

        this.markersMap.set(member.uid, marker);
      }
    }
  }

  centerOn(coords: Coordinates, zoom = 16): void {
    if (!this.map) return;
    this.map.setView([coords.lat, coords.lng], zoom, {
      animate: true,
    });
  }

  fitBounds(coordinates: Coordinates[]): void {
    if (!this.map || coordinates.length === 0) return;

    if (coordinates.length === 1) {
      this.centerOn(coordinates[0]);
      return;
    }

    const bounds = L.latLngBounds(coordinates.map((c) => [c.lat, c.lng]));
    this.map.fitBounds(bounds, { padding: [50, 50] });
  }

  private createAvatarIcon(member: MemberLocationState): L.DivIcon {
    const isLive = member.isLive;
    const initial = (member.display_name || 'F')[0].toUpperCase();
    const photoUrl = member.photo_url;

    const html = `
      <div class="relative cursor-pointer group transform transition-transform hover:scale-110">
        ${
          isLive
            ? '<span class="absolute -inset-1 rounded-full bg-status-online opacity-75 animate-ping"></span>'
            : ''
        }
        <div class="relative w-11 h-11 rounded-full border-2 ${
          isLive ? 'border-status-online shadow-glow-online' : 'border-surface-card shadow-sm'
        } bg-surface-card overflow-hidden flex items-center justify-center font-bold text-sm text-text-primary">
          ${
            photoUrl
              ? `<img src="${photoUrl}" alt="${escapeHtml(member.display_name)}" class="w-full h-full object-cover" />`
              : `<div class="w-full h-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">${initial}</div>`
          }
        </div>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-surface-canvas/90 backdrop-blur-sm border border-border-subtle text-[9px] font-bold text-text-primary whitespace-nowrap shadow-xs pointer-events-none">
          ${escapeHtml(member.display_name.split(' ')[0])}
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-leaflet-avatar',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

