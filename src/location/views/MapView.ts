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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

  // Estado del selector de usuarios
  let showAll = true;
  const selectedMemberUids = new Set<string>();

  container.innerHTML = `
    <div class="relative h-full w-full flex flex-col bg-surface-canvas text-text-primary overflow-hidden">
      
      <!-- Top Floating Header Pill -->
      <div class="shrink-0 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2 flex justify-between items-center z-20">
        <div class="flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel shadow-sm">
          <span class="w-2.5 h-2.5 rounded-full bg-status-online animate-pulse"></span>
          <span id="live-members-badge" class="text-xs font-bold text-text-primary font-sans">
            Localizando familia...
          </span>
        </div>
        <button 
          id="btn-logout"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-panel shadow-sm text-text-secondary hover:text-status-error transition-colors text-xs font-semibold"
          title="Cerrar sesión"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span class="hidden sm:inline">Salir</span>
        </button>
      </div>

      <!-- MAP FRAME: Cuadrado que ocupa el ancho de la pantalla -->
      <div class="px-4 shrink-0">
        <div class="relative w-full aspect-square max-h-[44vh] rounded-3xl overflow-hidden border border-surface-glass-border shadow-dock bg-surface-base">
          <div id="google-map-container" class="h-full w-full flex items-center justify-center">
            <div class="text-center p-6 text-text-secondary text-xs">
              <div class="w-8 h-8 mx-auto mb-2 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center animate-spin">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              Cargando mapa familiar...
            </div>
          </div>

          <!-- Botones flotantes sobre el mapa (Recentrar y Fit) -->
          <div class="absolute right-3 bottom-3 z-[500] flex flex-col gap-2">
            <button 
              id="btn-center-me"
              class="w-10 h-10 rounded-full glass-panel shadow-dock flex items-center justify-center text-brand-primary hover:scale-105 active:scale-95 transition-all"
              title="Centrar en mi posición"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <button 
              id="btn-fit-bounds"
              class="w-10 h-10 rounded-full glass-panel shadow-dock flex items-center justify-center text-text-primary hover:scale-105 active:scale-95 transition-all"
              title="Ver a todos en mapa"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- BARRA DE CONTROL INTERMEDIA: Toggle Switch -->
      <div class="px-5 py-2.5 shrink-0 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-text-primary">Familiares</span>
          <span id="selected-counter-badge" class="px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-bold">
            Todos visibles
          </span>
        </div>

        <label class="flex items-center gap-2.5 cursor-pointer select-none">
          <span class="text-xs font-semibold text-text-secondary">Mostrar todos</span>
          <div class="relative inline-flex items-center">
            <input type="checkbox" id="toggle-select-all" class="sr-only peer" checked>
            <div class="w-11 h-6 bg-border-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
          </div>
        </label>
      </div>

      <!-- LISTA DE CONTACTOS INFERIOR CON SCROLL -->
      <div class="flex-1 overflow-y-auto px-4 pb-24 space-y-2" id="contacts-list-container">
        <div class="p-6 text-center text-xs text-text-disabled">Cargando familiares...</div>
      </div>

      <!-- Bottom Sheet Modal Slot -->
      <div id="card-modal-slot" class="relative z-[1200]"></div>

      <!-- DS-NAV-DOCK: Bottom Floating Glass Navigation -->
      <nav class="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-[1100] pointer-events-auto">
        <div class="max-w-xs mx-auto h-14 rounded-full glass-dock shadow-dock flex items-center justify-around px-2">
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
  const contactsContainer = container.querySelector('#contacts-list-container') as HTMLElement;
  const toggleSelectAll = container.querySelector('#toggle-select-all') as HTMLInputElement;
  const counterBadge = container.querySelector('#selected-counter-badge') as HTMLElement;

  // Iniciar tracker de geolocalización
  tracker.start();

  function getVisibleMembers(): MemberLocationState[] {
    if (showAll) {
      return currentMembers;
    }
    return currentMembers.filter((m) => selectedMemberUids.has(m.uid));
  }

  function renderContactsList(): void {
    if (!contactsContainer) return;

    if (currentMembers.length === 0) {
      contactsContainer.innerHTML = `
        <div class="p-6 text-center text-xs text-text-disabled">No hay familiares registrados</div>
      `;
      return;
    }

    contactsContainer.innerHTML = currentMembers
      .map((member) => {
        const isSelected = showAll || selectedMemberUids.has(member.uid);
        const isInteractive = !showAll;
        const initial = member.display_name.charAt(0).toUpperCase();

        const cardBgClass = isInteractive
          ? isSelected
            ? 'bg-brand-primary/10 border-brand-primary/50 shadow-sm'
            : 'bg-surface-elevated/60 border-border-subtle opacity-70'
          : 'bg-surface-elevated/80 border-border-subtle';

        return `
          <div 
            data-uid="${escapeHtml(member.uid)}"
            class="contact-card flex items-center justify-between p-3 rounded-2xl border transition-all ${cardBgClass} ${
              isInteractive ? 'cursor-pointer active:scale-98 hover:border-brand-primary/40' : ''
            }"
          >
            <div class="flex items-center gap-3">
              <div class="relative">
                <div class="w-10 h-10 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center font-bold text-sm overflow-hidden">
                  ${
                    member.photo_url
                      ? `<img src="${escapeHtml(member.photo_url)}" alt="${escapeHtml(
                          member.display_name
                        )}" class="w-full h-full object-cover" />`
                      : initial
                  }
                </div>
                <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface-canvas ${
                  member.isLive ? 'bg-status-online animate-pulse' : 'bg-status-offline'
                }"></span>
              </div>
              <div>
                <h4 class="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  ${escapeHtml(member.display_name)}
                  ${member.uid === options.uid ? '<span class="text-[10px] text-brand-primary font-normal">(Tú)</span>' : ''}
                </h4>
                <p class="text-[11px] text-text-secondary">
                  ${member.isLive ? 'En línea ahora' : member.relativeTimeText || 'Desconectado'}
                </p>
              </div>
            </div>

            <!-- Checkbox / Status Indicator -->
            <div class="flex items-center gap-2">
              ${
                isInteractive
                  ? `
                <div class="w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                  isSelected
                    ? 'bg-brand-primary border-brand-primary text-brand-on-primary'
                    : 'border-border-strong bg-surface-canvas'
                }">
                  ${
                    isSelected
                      ? `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                         </svg>`
                      : ''
                  }
                </div>
              `
                  : `
                <span class="text-[10px] text-text-disabled font-medium px-2 py-0.5 rounded-full bg-surface-base">
                  Visible
                </span>
              `
              }
            </div>
          </div>
        `;
      })
      .join('');

    // Eventos de selección individual sobre tarjetas de contacto si no está en "Mostrar todos"
    if (!showAll) {
      contactsContainer.querySelectorAll('.contact-card').forEach((el) => {
        el.addEventListener('click', () => {
          const uid = el.getAttribute('data-uid');
          if (!uid) return;
          triggerHaptic('light');

          if (selectedMemberUids.has(uid)) {
            selectedMemberUids.delete(uid);
          } else {
            selectedMemberUids.add(uid);
          }

          updateMapAndUI();
        });
      });
    }
  }

  function updateMapAndUI(): void {
    const visible = getVisibleMembers();

    // Actualizar contador
    if (counterBadge) {
      if (showAll) {
        counterBadge.textContent = 'Todos visibles';
        counterBadge.className = 'px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-bold';
      } else {
        const count = selectedMemberUids.size;
        counterBadge.textContent = `${count} seleccionado${count === 1 ? '' : 's'}`;
        counterBadge.className =
          count > 0
            ? 'px-2 py-0.5 rounded-full bg-brand-primary text-brand-on-primary text-[10px] font-bold'
            : 'px-2 py-0.5 rounded-full bg-surface-highest text-text-secondary text-[10px] font-bold';
      }
    }

    // Actualizar marcadores en el mapa
    if (mapService) {
      mapService.updateMembers(visible);
    }

    // Refrescar lista de contactos
    renderContactsList();
  }

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
    updateMapAndUI();
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
        updateMapAndUI();
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

    // Inicializar selectedMemberUids con todos los miembros si está vacío
    if (selectedMemberUids.size === 0) {
      currentMembers.forEach((m) => selectedMemberUids.add(m.uid));
    }

    // Detectar posición del usuario actual para autocentrado
    const me = currentMembers.find((m) => m.uid === options.uid);
    if (me?.location) {
      const wasFirstFix = !currentUserCoords;
      currentUserCoords = { lat: me.location.lat, lng: me.location.lng };
      if (wasFirstFix && mapService) {
        mapService.centerOn(currentUserCoords);
      }
    }

    // Actualizar badge superior
    const liveCount = currentMembers.filter((m) => m.isLive).length;
    if (badgeEl) {
      badgeEl.textContent = `${liveCount} de ${currentMembers.length} familiares activos`;
    }

    updateMapAndUI();
  });

  // Toggle Switch Event
  toggleSelectAll?.addEventListener('change', () => {
    triggerHaptic('medium');
    showAll = toggleSelectAll.checked;

    if (showAll) {
      // Re-añadir todos al conjunto
      currentMembers.forEach((m) => selectedMemberUids.add(m.uid));
    }

    updateMapAndUI();
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
    const visibleCoords = getVisibleMembers()
      .map((m) => m.location)
      .filter((loc): loc is Coordinates & { updated_at: number } => Boolean(loc));
    if (mapService && visibleCoords.length > 0) {
      mapService.fitBounds(visibleCoords);
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

  // Retornar función de limpieza
  return () => {
    tracker.stop();
    if (membersUnsubscribe) {
      membersUnsubscribe();
      membersUnsubscribe = null;
    }
  };
}
