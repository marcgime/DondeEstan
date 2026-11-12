import { collection, onSnapshot, type Firestore, type Unsubscribe } from 'firebase/firestore';
import type { Coordinates, MemberLocationState } from '../types';
import { isUserLive } from '../presence';
import { formatRelativeTime } from '../geo_utils';
import { loadGoogleMaps } from '../maps_loader';
import { FamilyMapService } from '../map_service';
import { LeafletFamilyMapService } from '../leaflet_map_service';
import { renderDraggableBottomSheet } from '../components/DraggableBottomSheet';
import { triggerHaptic } from '../../ui/utils/haptics';
import type { GeolocationTracker } from '../tracker';

export interface MapViewOptions {
  uid: string;
  db: Firestore;
  tracker: GeolocationTracker;
  onNavigateTab?: (tab: 'map' | 'chat' | 'profile') => void;
  onLogout?: () => Promise<void>;
}

interface IMapEngine {
  initialize(center?: Coordinates, zoom?: number): boolean;
  updateMembers(members: MemberLocationState[]): void;
  centerOn(coords: Coordinates, zoom?: number): void;
  fitBounds(coordinates: Coordinates[]): void;
}

export function renderMapView(
  container: HTMLElement,
  options: MapViewOptions
): () => void {
  const { db, tracker } = options;
  let mapService: IMapEngine | null = null;
  let membersUnsubscribe: Unsubscribe | null = null;
  let currentUserCoords: Coordinates | null = null;
  let currentMembers: MemberLocationState[] = [];

  container.innerHTML = `
    <div class="relative h-full w-full overflow-hidden bg-surface-canvas text-text-primary">
      
      <!-- Top Floating Header Pill -->
      <div class="absolute top-4 inset-x-4 z-[1100] flex justify-between items-center pointer-events-none safe-top">
        <div class="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-full bg-surface-glass backdrop-blur-xl border border-surface-glass-border shadow-dock">
          <span class="w-2.5 h-2.5 rounded-full bg-status-online animate-pulse"></span>
          <span id="live-members-badge" class="text-xs font-bold text-text-primary font-sans">
            Localizando familia...
          </span>
        </div>
        <button 
          id="btn-logout"
          class="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-glass backdrop-blur-xl border border-surface-glass-border shadow-dock text-text-secondary hover:text-status-error transition-colors text-xs font-semibold"
          title="Cerrar sesión"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span class="hidden sm:inline">Salir</span>
        </button>
      </div>

      <!-- Map Container -->
      <div id="google-map-container" class="h-full w-full bg-surface-base flex items-center justify-center">
        <div class="text-center p-6 text-text-secondary text-xs">
          <div class="w-10 h-10 mx-auto mb-3 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center animate-spin">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          Cargando mapa en tiempo real...
        </div>
      </div>

      <!-- Floating Action Controls (Right side) -->
      <div class="absolute right-4 bottom-28 z-[1100] flex flex-col gap-3">
        <!-- Re-center on me -->
        <button 
          id="btn-center-me"
          class="w-12 h-12 rounded-full bg-surface-glass backdrop-blur-xl border border-surface-glass-border shadow-dock flex items-center justify-center text-brand-primary hover:scale-105 active:scale-95 transition-all"
          title="Centrar en mi posición"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <!-- Fit all family bounds -->
        <button 
          id="btn-fit-bounds"
          class="w-12 h-12 rounded-full bg-surface-glass backdrop-blur-xl border border-surface-glass-border shadow-dock flex items-center justify-center text-text-primary hover:scale-105 active:scale-95 transition-all"
          title="Ver a todos los familiares"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      <!-- Bottom Sheet Modal Slot -->
      <div id="card-modal-slot" class="relative z-[1200]"></div>

      <!-- DS-NAV-DOCK: Bottom Floating Glass Navigation -->
      <nav class="absolute inset-x-4 bottom-4 z-[1100] safe-bottom pointer-events-auto">
        <div class="max-w-xs mx-auto h-14 rounded-full bg-surface-glass backdrop-blur-2xl border border-surface-glass-border shadow-dock flex items-center justify-around px-2">
          
          <!-- Map Tab (Active) -->
          <button class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-primary text-brand-on-primary text-xs font-bold shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>Mapa</span>
          </button>

          <!-- Chat Tab -->
          <button id="nav-btn-chat" class="flex items-center gap-1.5 px-4 py-2 rounded-full text-text-secondary hover:text-text-primary text-xs font-bold transition-all">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Chat</span>
          </button>

          <!-- Settings Tab -->
          <button id="nav-btn-profile" class="flex items-center gap-1.5 px-4 py-2 rounded-full text-text-secondary hover:text-text-primary text-xs font-bold transition-all">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Perfil</span>
          </button>

        </div>
      </nav>

    </div>
  `;

  const mapContainer = container.querySelector('#google-map-container') as HTMLElement;
  const modalSlot = container.querySelector('#card-modal-slot') as HTMLElement;
  const badgeEl = container.querySelector('#live-members-badge') as HTMLElement;

  // Iniciar tracker de geolocalización
  tracker.start();

  function initLeaflet(): void {
    const leafletService = new LeafletFamilyMapService(mapContainer, (selectedMember) => {
      renderDraggableBottomSheet(modalSlot, {
        member: selectedMember,
        onCenter: (coords) => {
          mapService?.centerOn(coords);
        },
        onClose: () => {
          modalSlot.innerHTML = '';
        },
      });
    });
    const defaultCenter = currentUserCoords || { lat: 41.5674, lng: 2.0109 };
    leafletService.initialize(defaultCenter, 15);
    mapService = leafletService;
    if (currentMembers.length > 0) {
      mapService.updateMembers(currentMembers);
      if (currentUserCoords) {
        mapService.centerOn(currentUserCoords);
      }
    }
  }

  // Inicializar Google Maps con fallback automático a Leaflet interactivo
  loadGoogleMaps()
    .then(() => {
      const gMap = new FamilyMapService(mapContainer, (selectedMember) => {
        renderDraggableBottomSheet(modalSlot, {
          member: selectedMember,
          onCenter: (coords) => {
            mapService?.centerOn(coords);
          },
          onClose: () => {
            modalSlot.innerHTML = '';
          },
        });
      });

      const initialized = gMap.initialize();
      if (initialized) {
        mapService = gMap;
        if (currentMembers.length > 0) {
          mapService.updateMembers(currentMembers);
        }
      } else {
        initLeaflet();
      }
    })
    .catch(() => {
      initLeaflet();
    });

  // Suscribirse a la colección de usuarios en tiempo real
  const usersCollection = collection(db, 'users');
  membersUnsubscribe = onSnapshot(usersCollection, (snapshot) => {
    const now = Date.now();
    currentMembers = snapshot.docs.map((d) => {
      const data = d.data();
      const updatedTimestamp = data.location?.updated_at?.toMillis?.() || data.updated_at?.toMillis?.() || 0;
      const live = isUserLive(data.status || 'offline', updatedTimestamp, now);

      return {
        uid: d.id,
        display_name: data.display_name || 'Familiar',
        email: data.email || '',
        photo_url: data.photo_url,
        role: data.role || 'member',
        status: data.status || 'offline',
        isLive: live,
        location: data.location
          ? {
              lat: data.location.lat,
              lng: data.location.lng,
              updated_at: updatedTimestamp,
            }
          : undefined,
        relativeTimeText: formatRelativeTime(updatedTimestamp, now),
      };
    });

    // Detectar posición del usuario actual para autocentrado
    const me = currentMembers.find((m) => m.uid === options.uid);
    if (me?.location) {
      const wasFirstFix = !currentUserCoords;
      currentUserCoords = { lat: me.location.lat, lng: me.location.lng };
      if (wasFirstFix && mapService) {
        mapService.centerOn(currentUserCoords);
      }
    }

    // Actualizar badge de miembros activos
    const liveCount = currentMembers.filter((m) => m.isLive).length;
    if (badgeEl) {
      badgeEl.textContent = `${liveCount} de ${currentMembers.length} familiares activos`;
    }

    if (mapService) {
      mapService.updateMembers(currentMembers);
    }
  });

  // Controles
  container.querySelector('#btn-center-me')?.addEventListener('click', () => {
    triggerHaptic('medium');
    if (currentUserCoords && mapService) {
      mapService.centerOn(currentUserCoords);
    }
  });

  container.querySelector('#btn-fit-bounds')?.addEventListener('click', () => {
    triggerHaptic('light');
    const validCoords = currentMembers
      .map((m) => m.location)
      .filter((loc): loc is Coordinates & { updated_at: number } => Boolean(loc));
    if (mapService && validCoords.length > 0) {
      mapService.fitBounds(validCoords);
    }
  });

  container.querySelector('#btn-logout')?.addEventListener('click', async () => {
    triggerHaptic('light');
    if (options.onLogout) {
      await options.onLogout();
    }
  });

  // Navegación Bottom Dock
  container.querySelector('#nav-btn-chat')?.addEventListener('click', () => {
    triggerHaptic('light');
    if (options.onNavigateTab) {
      options.onNavigateTab('chat');
    }
  });

  container.querySelector('#nav-btn-profile')?.addEventListener('click', () => {
    triggerHaptic('light');
    if (options.onNavigateTab) {
      options.onNavigateTab('profile');
    }
  });

  // Retornar función de limpieza (desuscripción)
  return () => {
    tracker.stop();
    if (membersUnsubscribe) {
      membersUnsubscribe();
      membersUnsubscribe = null;
    }
  };
}

