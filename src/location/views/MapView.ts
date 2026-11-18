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
import type { GroupService } from '../../admin/group_service';
import type { Group } from '../../admin/types';
import type { UserProfile } from '../../auth/types';

export interface MapViewOptions {
  uid: string;
  db: Firestore;
  tracker: GeolocationTracker;
  groupService?: GroupService;
  currentUser?: UserProfile;
  onNavigateTab?: (tab: 'map' | 'chat' | 'profile') => void;
  onLogout?: () => Promise<void>;
}

interface IMapEngine {
  initialize(center?: Coordinates, zoom?: number): boolean;
  updateMembers(members: MemberLocationState[]): void;
  centerOn(coords: Coordinates, zoom?: number): void;
  fitBounds(coordinates: Coordinates[]): void;
  zoomIn?(): void;
  zoomOut?(): void;
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
  let groupsUnsubscribe: Unsubscribe | null = null;
  let currentUserCoords: Coordinates | null = null;
  let currentMembers: MemberLocationState[] = [];
  let accessibleGroups: Group[] = [];
  let activeGroupId = 'all';

  // Estado del selector de usuarios
  let showAll = true;
  const selectedMemberUids = new Set<string>();

  container.innerHTML = `
    <div id="map-view-root" class="relative h-full w-full flex flex-col bg-surface-canvas text-text-primary overflow-hidden">
      
      <!-- iOS Nav Bar (Compact 44pt row: Page Title + Live Status + Group Action) -->
      <header class="ios-nav-bar safe-header-top">
        <div class="flex items-center gap-2.5 min-w-0">
          <h1 class="text-base font-extrabold tracking-tight text-text-primary shrink-0">Mapa</h1>
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-elevated border border-border-subtle truncate">
            <span class="w-2 h-2 rounded-full bg-status-online animate-pulse shrink-0"></span>
            <span id="live-members-badge" class="text-[0.6875rem] font-bold text-text-secondary font-sans truncate">
              Localizando...
            </span>
          </div>
        </div>

        <!-- Primary Nav Bar Action: Group Selector Slot -->
        <div id="group-selector-slot" class="flex items-center shrink-0"></div>
      </header>

      <!-- MAP FRAME: Cuadrado que ocupa el ancho de la pantalla -->
      <div class="px-4 pt-2.5 shrink-0">
        <div class="relative w-full aspect-square max-h-[44vh] rounded-3xl overflow-hidden border border-surface-glass-border shadow-dock bg-surface-base">
          <div id="google-map-container" class="h-full w-full flex items-center justify-center">
            <div class="text-center p-6 text-text-secondary text-xs">
              <div class="w-8 h-8 mx-auto mb-2 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center animate-spin">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              Cargando mapa...
            </div>
          </div>

          <!-- Botones flotantes sobre el mapa (Zoom, Recentrar y Fit) -->
          <div class="absolute right-3 bottom-3 z-[500] flex flex-col gap-2">
            <!-- Zoom In (+) -->
            <button 
              id="btn-zoom-in"
              class="w-9 h-9 rounded-full glass-panel shadow-dock flex items-center justify-center text-text-primary hover:scale-105 active:scale-95 transition-all text-base font-bold select-none"
              title="Acercar mapa"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <!-- Zoom Out (-) -->
            <button 
              id="btn-zoom-out"
              class="w-9 h-9 rounded-full glass-panel shadow-dock flex items-center justify-center text-text-primary hover:scale-105 active:scale-95 transition-all text-base font-bold select-none"
              title="Alejar mapa"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
              </svg>
            </button>

            <!-- Re-center on me -->
            <button 
              id="btn-center-me"
              class="w-9 h-9 rounded-full glass-panel shadow-dock flex items-center justify-center text-brand-primary hover:scale-105 active:scale-95 transition-all"
              title="Centrar en mi posición"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <!-- Fit all bounds -->
            <button 
              id="btn-fit-bounds"
              class="w-9 h-9 rounded-full glass-panel shadow-dock flex items-center justify-center text-text-primary hover:scale-105 active:scale-95 transition-all"
              title="Ver a todos en mapa"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- BARRA DE CONTROL INTERMEDIA: Toggle Switch -->
      <div class="px-5 py-2.5 shrink-0 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span id="selected-counter-badge" class="px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-[0.6875rem] font-bold">
            Todos visibles
          </span>
        </div>

        <label class="flex items-center gap-2.5 cursor-pointer select-none">
          <span class="text-xs font-semibold text-text-secondary">Mostrar todos</span>
          <div class="relative inline-flex items-center">
            <input type="checkbox" id="toggle-select-all" class="sr-only peer" checked>
            <div class="w-11 h-6 bg-surface-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
          </div>
        </label>
      </div>

      <!-- BOTTOM CONTACTS LIST: Scroll vertical -->
      <div id="contacts-scroll-wrapper" class="flex-1 overflow-y-auto px-4 pb-28">
        <div id="contacts-scroll-container" class="flex flex-col gap-2">
          <div class="p-6 text-center text-xs text-text-disabled">Cargando usuarios...</div>
        </div>
      </div>

      <!-- Bottom Dock: Floating Navigation -->
      <nav class="absolute inset-x-4 safe-dock-bottom z-30 pointer-events-auto">
        <div class="max-w-xs mx-auto h-14 rounded-full glass-dock shadow-dock flex items-center justify-around px-2">
          
          <!-- Map Tab (Active) -->
          <button
            id="nav-btn-map-active"
            class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-primary text-brand-on-primary text-xs font-bold shadow-sm"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>Mapa</span>
          </button>

          <!-- Chat Tab -->
          <button 
            id="nav-btn-chat" 
            class="flex items-center gap-1.5 px-4 py-2 rounded-full text-text-secondary hover:text-text-primary text-xs font-bold transition-all"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Chat</span>
          </button>

          <!-- Profile Tab -->
          <button 
            id="nav-btn-profile" 
            class="flex items-center gap-1.5 px-4 py-2 rounded-full text-text-secondary hover:text-text-primary text-xs font-bold transition-all"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Perfil</span>
          </button>

        </div>
      </nav>

      <!-- Slot para Bottom Sheet de detalles de usuario -->
      <div id="modal-slot"></div>

    </div>
  `;

  const mapRoot = container.querySelector('#map-view-root') as HTMLElement;
  const mapContainer = container.querySelector('#google-map-container') as HTMLElement;
  const contactsWrapper = container.querySelector('#contacts-scroll-wrapper') as HTMLElement;
  const contactsContainer = container.querySelector('#contacts-scroll-container') as HTMLElement;
  const liveBadge = container.querySelector('#live-members-badge') as HTMLElement;
  const modalSlot = container.querySelector('#modal-slot') as HTMLElement;
  const toggleSelectAll = container.querySelector('#toggle-select-all') as HTMLInputElement;
  const counterBadge = container.querySelector('#selected-counter-badge') as HTMLElement;

  // Iniciar tracker de geolocalización
  tracker.start();

  /**
   * Obtiene los miembros que pertenecen al grupo activo (o a cualquier grupo del usuario si 'all').
   */
  function getGroupMembers(): MemberLocationState[] {
    if (activeGroupId === 'all') {
      if (options.currentUser?.role === 'admin') return currentMembers;
      const myGroups = new Set(options.currentUser?.groupIds || []);
      return currentMembers.filter(
        (m) => m.role === 'admin' || (Array.isArray(m.groupIds) && m.groupIds.some((gid) => myGroups.has(gid)))
      );
    }
    return currentMembers.filter(
      (m) => m.role === 'admin' || (Array.isArray(m.groupIds) && m.groupIds.includes(activeGroupId))
    );
  }

  function getVisibleMembers(): MemberLocationState[] {
    const groupMembers = getGroupMembers();
    if (showAll) {
      return groupMembers;
    }
    return groupMembers.filter((m) => selectedMemberUids.has(m.uid));
  }

  function renderGroupSelector(): void {
    const slot = container.querySelector('#group-selector-slot');
    if (!slot) return;

    if (accessibleGroups.length <= 1) {
      const groupName = accessibleGroups[0]?.name || 'Familia';
      slot.innerHTML = `
        <span class="px-3 py-1 rounded-full bg-surface-elevated border border-border-subtle shadow-sm text-xs font-bold text-brand-primary whitespace-nowrap">
          ${escapeHtml(groupName)}
        </span>
      `;
      return;
    }

    slot.innerHTML = `
      <select 
        id="select-active-group" 
        class="bg-surface-elevated text-xs font-bold text-text-primary px-3 py-1.5 rounded-full border border-border-subtle shadow-sm focus:outline-none cursor-pointer"
      >
        <option value="all" ${activeGroupId === 'all' ? 'selected' : ''}>Todos los grupos</option>
        ${accessibleGroups
          .map(
            (g) => `
          <option value="${g.id}" ${g.id === activeGroupId ? 'selected' : ''}>
            ${escapeHtml(g.name)}
          </option>
        `
          )
          .join('')}
      </select>
    `;

    slot.querySelector('#select-active-group')?.addEventListener('change', (e) => {
      activeGroupId = (e.target as HTMLSelectElement).value;
      triggerHaptic('light');
      if (showAll) {
        selectedMemberUids.clear();
        getGroupMembers().forEach((m) => selectedMemberUids.add(m.uid));
      }
      updateMapAndUI();
      autoFitVisibleMembers();
    });
  }

  function renderContactsList(): void {
    if (!contactsContainer) return;
    const groupMembers = getGroupMembers();

    if (groupMembers.length === 0) {
      contactsContainer.innerHTML = `
        <div class="p-6 text-center text-xs text-text-disabled">No hay usuarios en este grupo</div>
      `;
      return;
    }

    contactsContainer.innerHTML = groupMembers
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
                  ${member.uid === options.uid ? '<span class="text-[0.6875rem] text-brand-primary font-normal">(Tú)</span>' : ''}
                </h4>
                <p class="text-[0.75rem] text-text-secondary">
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
                <span class="text-[0.6875rem] text-text-disabled font-medium px-2 py-0.5 rounded-full bg-surface-base">
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
          autoFitVisibleMembers();
        });
      });
    }
  }

  function updateMapAndUI(): void {
    const visibleMembers = getVisibleMembers();
    const groupMembers = getGroupMembers();

    // Actualizar marcadores en el mapa
    if (mapService) {
      mapService.updateMembers(visibleMembers);
    }

    // Actualizar badges
    const liveCount = visibleMembers.filter((m) => m.isLive).length;
    if (liveBadge) {
      liveBadge.textContent =
        liveCount > 0 ? `${liveCount} en línea` : `${visibleMembers.length} usuarios`;
    }

    if (counterBadge) {
      if (showAll) {
        counterBadge.textContent = 'Todos visibles';
        counterBadge.className = 'px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-[0.6875rem] font-bold';
      } else {
        const count = selectedMemberUids.size;
        counterBadge.textContent = `${count} de ${groupMembers.length} seleccionados`;
        counterBadge.className = count > 0 
          ? 'px-2.5 py-0.5 rounded-full bg-status-online/15 text-status-online text-[0.6875rem] font-bold'
          : 'px-2.5 py-0.5 rounded-full bg-surface-elevated text-text-disabled text-[0.6875rem] font-bold';
      }
    }

    // Re-renderizar lista
    renderContactsList();
  }

  function autoFitVisibleMembers(): void {
    if (!mapService) return;
    const visibleCoords = getVisibleMembers()
      .map((m) => m.location)
      .filter((loc): loc is Coordinates & { updated_at: number } => Boolean(loc));

    if (visibleCoords.length === 1) {
      mapService.centerOn(visibleCoords[0], 16);
    } else if (visibleCoords.length > 1) {
      mapService.fitBounds(visibleCoords);
    }
  }

  function openMemberSheet(selectedMember: MemberLocationState): void {
    mapRoot?.classList.add('ios-modal-open');
    renderDraggableBottomSheet(modalSlot, {
      member: selectedMember,
      onCenter: (coords) => {
        mapService?.centerOn(coords);
      },
      onClose: () => {
        modalSlot.innerHTML = '';
        mapRoot?.classList.remove('ios-modal-open');
      },
    });
  }

  function initLeaflet(): void {
    const leafletService = new LeafletFamilyMapService(mapContainer, openMemberSheet);
    const defaultCenter = currentUserCoords || { lat: 41.5674, lng: 2.0109 };
    leafletService.initialize(defaultCenter, 15);
    mapService = leafletService;
    updateMapAndUI();
  }

  // Inicializar Google Maps con fallback automático a Leaflet interactivo
  loadGoogleMaps()
    .then(() => {
      const gMap = new FamilyMapService(mapContainer, openMemberSheet);

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

  // Suscribirse a grupos si está provisto el servicio
  if (options.groupService) {
    groupsUnsubscribe = options.groupService.subscribeToGroups((groupsList) => {
      accessibleGroups = options.groupService!.getUserGroups(
        options.currentUser || {
          uid: options.uid,
          email: '',
          display_name: '',
          role: 'member',
          status: 'active',
          groupIds: [],
        },
        groupsList
      );
      renderGroupSelector();
      if (showAll) {
        getGroupMembers().forEach((m) => selectedMemberUids.add(m.uid));
      }
      updateMapAndUI();
    });
  }

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
        groupIds: Array.isArray(data.groupIds) ? data.groupIds : [],
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

    // Guardar posición del usuario actual
    const me = currentMembers.find((m) => m.uid === options.uid);
    if (me?.location) {
      currentUserCoords = { lat: me.location.lat, lng: me.location.lng };
    }

    // Inicializar seleccionados si está en "Mostrar todos"
    if (showAll) {
      selectedMemberUids.clear();
      getGroupMembers().forEach((m) => selectedMemberUids.add(m.uid));
    }

    updateMapAndUI();
  });

  // Interacción: Toggle Switch
  toggleSelectAll.addEventListener('change', () => {
    triggerHaptic('medium');
    showAll = toggleSelectAll.checked;

    if (showAll) {
      selectedMemberUids.clear();
      getGroupMembers().forEach((m) => selectedMemberUids.add(m.uid));
    }

    updateMapAndUI();
    autoFitVisibleMembers();
  });

  // Controles de Zoom Manual
  container.querySelector('#btn-zoom-in')?.addEventListener('click', () => {
    triggerHaptic('light');
    if (mapService && typeof mapService.zoomIn === 'function') {
      mapService.zoomIn();
    }
  });

  container.querySelector('#btn-zoom-out')?.addEventListener('click', () => {
    triggerHaptic('light');
    if (mapService && typeof mapService.zoomOut === 'function') {
      mapService.zoomOut();
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
    const visibleCoords = getVisibleMembers()
      .map((m) => m.location)
      .filter((loc): loc is Coordinates & { updated_at: number } => Boolean(loc));
    if (mapService && visibleCoords.length > 0) {
      mapService.fitBounds(visibleCoords);
    }
  });

  // Navegación Bottom Dock (iOS 26 Tab Bar)
  container.querySelector('#nav-btn-map-active')?.addEventListener('click', () => {
    triggerHaptic('light');
    if (contactsWrapper) {
      contactsWrapper.scrollTo({ top: 0, behavior: 'smooth' });
    }
    autoFitVisibleMembers();
  });

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
    if (groupsUnsubscribe) {
      groupsUnsubscribe();
      groupsUnsubscribe = null;
    }
  };
}
