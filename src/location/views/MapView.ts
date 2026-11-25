import { collection, onSnapshot, type Firestore, type Unsubscribe } from 'firebase/firestore';
import type { Coordinates, MemberLocationState } from '../types';
import { isUserLive } from '../presence';
import { formatRelativeTime } from '../geo_utils';
import { loadGoogleMaps } from '../maps_loader';
import { FamilyMapService } from '../map_service';
import { LeafletFamilyMapService } from '../leaflet_map_service';
import { renderDraggableBottomSheet } from '../components/DraggableBottomSheet';
import { renderFloatingTabBar, type FloatingTabId } from '../../ui/components/FloatingTabBar';
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
  onNavigateTab?: (tab: FloatingTabId) => void;
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
    <div id="map-view-root" class="relative h-full w-full flex flex-col bg-surface-canvas text-text-primary overflow-hidden overscroll-contain-y">
      
      <!-- iOS Nav Bar (Opaca, sin blur) -->
      <header class="ios-nav-bar safe-header-top">
        <div class="flex items-center gap-2.5 min-w-0">
          <h1 class="ios-nav-title-compact shrink-0">Mapa</h1>
          <div class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-strong truncate">
            <span class="w-2 h-2 rounded-full bg-status-online shrink-0"></span>
            <span id="live-members-badge" class="text-[13px] font-medium text-text-secondary tabular-nums truncate">
              Localizando...
            </span>
          </div>
        </div>

        <!-- Primary Nav Bar Action: Group Selector Slot -->
        <div id="group-selector-slot" class="flex items-center shrink-0"></div>
      </header>

      <!-- MAP FRAME -->
      <div class="px-4 pt-3 shrink-0">
        <div class="relative w-full aspect-square max-h-[42vh] rounded-[16px] overflow-hidden border border-border-strong bg-surface-elevated">
          <div id="google-map-container" class="h-full w-full flex items-center justify-center">
            <div class="text-center p-6 text-text-disabled text-[13px]">
              Cargando mapa...
            </div>
          </div>

          <!-- Botones flotantes sobre el mapa -->
          <div class="absolute right-3 bottom-3 z-[500] flex flex-col gap-2">
            <button 
              id="btn-zoom-in"
              class="w-9 h-9 rounded-full bg-surface-elevated border border-border-strong shadow-dock flex items-center justify-center text-text-primary select-none"
              title="Acercar mapa"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <button 
              id="btn-zoom-out"
              class="w-9 h-9 rounded-full bg-surface-elevated border border-border-strong shadow-dock flex items-center justify-center text-text-primary select-none"
              title="Alejar mapa"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
              </svg>
            </button>

            <button 
              id="btn-center-me"
              class="w-9 h-9 rounded-full bg-surface-elevated border border-border-strong shadow-dock flex items-center justify-center text-brand-primary"
              title="Centrar en mi posición"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <button 
              id="btn-fit-bounds"
              class="w-9 h-9 rounded-full bg-surface-elevated border border-border-strong shadow-dock flex items-center justify-center text-text-primary"
              title="Ver a todos en mapa"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- BARRA DE CONTROL INTERMEDIA -->
      <div class="px-5 py-3 shrink-0 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span id="selected-counter-badge" class="text-[13px] font-medium text-brand-primary tabular-nums">
            Todos visibles
          </span>
        </div>

        <label class="flex items-center gap-2.5 cursor-pointer select-none">
          <span class="text-[13px] font-medium text-text-secondary">Mostrar todos</span>
          <div class="relative inline-flex items-center">
            <input type="checkbox" id="toggle-select-all" class="sr-only peer" checked>
            <div class="w-11 h-6 bg-surface-inset peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-elevated after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
          </div>
        </label>
      </div>

      <!-- BOTTOM CONTACTS LIST: Inset Grouped -->
      <div id="contacts-scroll-wrapper" class="flex-1 overflow-y-auto overscroll-contain-y px-4 pb-28">
        <div id="contacts-scroll-container" class="ios-grouped-list">
          <div class="p-6 text-center text-[13px] text-text-disabled">Cargando usuarios...</div>
        </div>
      </div>

      <!-- Bottom Dock: Floating Navigation Slot -->
      <div id="map-dock-slot"></div>

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
      updateTabBar();
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
        <div class="p-6 text-center text-[13px] text-text-disabled">Sin usuarios en este grupo</div>
      `;
      return;
    }

    contactsContainer.innerHTML = groupMembers
      .map((member) => {
        const isSelected = showAll || selectedMemberUids.has(member.uid);
        const isInteractive = !showAll;
        const initial = member.display_name.charAt(0).toUpperCase();

        return `
          <div 
            data-uid="${escapeHtml(member.uid)}"
            class="contact-card ios-grouped-row ios-grouped-row--inset-avatar ${
              isInteractive ? 'ios-tap cursor-pointer' : ''
            } ${isInteractive && !isSelected ? 'opacity-60' : ''}"
          >
            <div class="flex items-center gap-3.5 min-w-0">
              <div class="relative shrink-0">
                <div class="w-10 h-10 rounded-full bg-surface-inset text-text-primary flex items-center justify-center font-semibold text-[15px] overflow-hidden">
                  ${
                    member.photo_url
                      ? `<img src="${escapeHtml(member.photo_url)}" alt="${escapeHtml(
                          member.display_name
                        )}" class="w-full h-full object-cover" />`
                      : initial
                  }
                </div>
                <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface-elevated ${
                  member.isLive ? 'bg-status-online' : 'bg-status-offline'
                }"></span>
              </div>
              <div class="min-w-0">
                <h4 class="text-[17px] font-medium text-text-primary flex items-center gap-1.5 truncate">
                  ${escapeHtml(member.display_name)}
                  ${member.uid === options.uid ? '<span class="text-[13px] text-brand-primary font-normal">(Tú)</span>' : ''}
                </h4>
                <p class="text-[13px] text-text-secondary tabular-nums truncate">
                  ${member.isLive ? 'En línea ahora' : member.relativeTimeText || 'Desconectado'}
                </p>
              </div>
            </div>

            <!-- Checkbox / Status Indicator -->
            <div class="flex items-center gap-2 shrink-0">
              ${
                isInteractive
                  ? `
                <div class="w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                  isSelected
                    ? 'bg-brand-primary border-brand-primary text-brand-on-primary'
                    : 'border-text-disabled bg-surface-elevated'
                }">
                  ${
                    isSelected
                      ? `<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                         </svg>`
                      : ''
                  }
                </div>
              `
                  : `
                <span class="text-[13px] text-text-disabled font-normal">
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
        counterBadge.className = 'text-[13px] font-medium text-brand-primary tabular-nums';
      } else {
        const count = selectedMemberUids.size;
        counterBadge.textContent = `${count} de ${groupMembers.length} seleccionados`;
        counterBadge.className = count > 0 
          ? 'text-[13px] font-medium text-status-online tabular-nums'
          : 'text-[13px] font-medium text-text-disabled tabular-nums';
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
      updateTabBar();
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

  // Navegación Bottom Dock (auto-compacto a los 4s + onda efecto agua 0.5s)
  const dockSlot = container.querySelector('#map-dock-slot') as HTMLElement | null;
  let cleanupTabBar: (() => void) | null = null;

  function updateTabBar(): void {
    if (!dockSlot) return;
    if (cleanupTabBar) {
      cleanupTabBar();
      cleanupTabBar = null;
    }
    const showGuia = accessibleGroups.some((g) => g.guia_enabled);

    cleanupTabBar = renderFloatingTabBar(dockSlot, {
      activeTab: 'map',
      showGuiaTab: showGuia,
      onNavigateTab: options.onNavigateTab,
      onActiveTabClick: () => {
        if (contactsWrapper) {
          contactsWrapper.scrollTo({ top: 0, behavior: 'smooth' });
        }
        autoFitVisibleMembers();
      },
    });
  }

  updateTabBar();

  // Retornar función de limpieza
  return () => {
    if (cleanupTabBar) {
      cleanupTabBar();
    }
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
