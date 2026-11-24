import type { GuiaService } from '../guia_service';
import type { GroupTrip, NewTripRequest, TravelPreferences } from '../types';
import type { Group, GroupService } from '../../admin';
import type { UserProfile } from '../../auth/types';
import { renderFloatingTabBar, type FloatingTabId } from '../../ui/components/FloatingTabBar';
import { triggerHaptic } from '../../ui/utils/haptics';
import { generateGroupItinerary } from '../generator';

export interface GuiaViewOptions {
  guiaService: GuiaService;
  groupService?: GroupService;
  currentUser: UserProfile;
  initialGroupId?: string;
  onNavigateTab: (tab: FloatingTabId) => void;
  onLogout?: () => Promise<void>;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderGuiaView(
  container: HTMLElement,
  options: GuiaViewOptions
): () => void {
  const { guiaService, groupService, currentUser, onNavigateTab } = options;

  let accessibleGroups: Group[] = [];
  let activeGroupId: string = options.initialGroupId || '';
  let trips: GroupTrip[] = [];
  let selectedTrip: GroupTrip | null = null;
  let activeDayIndex: number = 0;
  let isSavingTrip = false;
  let groupsLoaded = !groupService;

  let groupsUnsubscribe: (() => void) | null = null;
  let tripsUnsubscribe: (() => void) | null = null;
  let cleanupTabBar: (() => void) | null = null;

  function renderViewRoot(): void {
    container.innerHTML = `
      <div id="guia-view-root" class="relative h-full w-full flex flex-col bg-surface-canvas text-text-primary overflow-hidden">
        
        <!-- iOS Nav Bar (Cabecera fija con selector de grupo y botón nuevo viaje) -->
        <header class="ios-nav-bar safe-header-top">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-lg">🧭</span>
            <h1 class="text-base font-extrabold tracking-tight text-text-primary">GuIA Viajes</h1>
          </div>
          
          <div class="flex items-center gap-2 shrink-0">
            <div id="guia-group-selector-slot" class="flex items-center"></div>
            
            <button
              id="btn-open-new-trip"
              type="button"
              class="h-8 px-3 rounded-full bg-brand-primary text-brand-on-primary font-bold text-xs flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all shadow-xs"
            >
              <span>+</span>
              <span class="hidden sm:inline">Nuevo Viaje</span>
            </button>
          </div>
        </header>

        <!-- Contenedor Principal Scrolleable -->
        <div id="guia-scroll-container" class="flex-1 overflow-y-auto px-4 pt-3 pb-32">
          <div id="guia-content-slot" class="max-w-xl mx-auto flex flex-col gap-4">
            <!-- Vistas dinámicas inyectadas por JS -->
          </div>
        </div>

        <!-- Dock Flotante Inferior -->
        <div id="guia-dock-slot"></div>

        <!-- Modal Crear Nuevo Viaje -->
        <div id="guia-modal-container"></div>
      </div>
    `;

    renderGroupSelector();
    renderContent();
    renderTabBar();
    bindHeaderEvents();
  }

  function renderGroupSelector(): void {
    const slot = container.querySelector('#guia-group-selector-slot');
    if (!slot) return;

    if (accessibleGroups.length <= 1) {
      const gname = accessibleGroups[0]?.name || 'Mi Grupo';
      slot.innerHTML = `
        <span class="text-[0.75rem] font-bold px-2.5 py-1 rounded-full bg-surface-elevated text-text-secondary border border-border-subtle truncate max-w-[130px]" title="${escapeHtml(gname)}">
          ${escapeHtml(gname)}
        </span>
      `;
      return;
    }

    slot.innerHTML = `
      <select
        id="select-guia-group"
        class="h-8 px-2.5 rounded-full bg-surface-elevated border border-border-subtle text-[0.75rem] font-bold text-text-primary focus:outline-none focus:border-brand-primary cursor-pointer truncate max-w-[140px]"
      >
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

    slot.querySelector('#select-guia-group')?.addEventListener('change', (e) => {
      const nextGid = (e.target as HTMLSelectElement).value;
      if (nextGid !== activeGroupId) {
        activeGroupId = nextGid;
        triggerHaptic('light');
        selectedTrip = null;
        subscribeToTrips();
        renderGroupSelector();
        renderTabBar();
      }
    });
  }

  function renderTabBar(): void {
    const dockSlot = container.querySelector('#guia-dock-slot') as HTMLElement | null;
    if (!dockSlot) return;

    if (cleanupTabBar) {
      cleanupTabBar();
      cleanupTabBar = null;
    }

    // Solo si los grupos ya cargaron en Firestore y ninguno tiene GuIA habilitado, redirigir
    if (groupsLoaded && accessibleGroups.length > 0) {
      const anyGuia = accessibleGroups.some((g) => g.guia_enabled);
      if (!anyGuia) {
        onNavigateTab('map');
        return;
      }
    }

    cleanupTabBar = renderFloatingTabBar(dockSlot, {
      activeTab: 'guia',
      showGuiaTab: true,
      onNavigateTab,
      onActiveTabClick: () => {
        if (selectedTrip) {
          selectedTrip = null;
          renderContent();
        } else {
          const scrollEl = container.querySelector('#guia-scroll-container') as HTMLElement | null;
          scrollEl?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
    });
  }

  function renderContent(): void {
    const contentSlot = container.querySelector('#guia-content-slot');
    if (!contentSlot) return;

    if (!groupsLoaded) {
      contentSlot.innerHTML = `
        <div class="p-8 rounded-3xl glass-panel text-center my-6">
          <div class="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin mx-auto mb-3"></div>
          <p class="text-xs text-text-secondary">Cargando itinerarios de GuIA...</p>
        </div>
      `;
      return;
    }

    if (selectedTrip) {
      renderTripDetail(contentSlot);
    } else {
      renderTripsCatalog(contentSlot);
    }
  }

  function renderTripsCatalog(slot: Element): void {
    const currentGroupName = accessibleGroups.find((g) => g.id === activeGroupId)?.name || 'el grupo';

    if (trips.length === 0) {
      slot.innerHTML = `
        <div class="p-8 rounded-3xl glass-panel text-center flex flex-col items-center justify-center my-6">
          <div class="w-16 h-16 rounded-3xl bg-brand-primary/10 text-brand-primary flex items-center justify-center text-3xl mb-3 shadow-xs">
            ✈️
          </div>
          <h2 class="text-base font-extrabold text-text-primary mb-1">
            Sin viajes planificados en ${escapeHtml(currentGroupName)}
          </h2>
          <p class="text-xs text-text-secondary max-w-sm mb-5 leading-relaxed">
            Diseña un nuevo itinerario con la asistencia inteligente de GuIA para disfrutarlo con los miembros de tu grupo.
          </p>
          <button
            id="btn-create-first-trip"
            type="button"
            class="px-5 py-2.5 rounded-full bg-brand-primary text-brand-on-primary font-bold text-xs hover:opacity-95 active:scale-95 transition-all shadow-sm flex items-center gap-2"
          >
            <span>+</span>
            <span>Planificar Primer Viaje</span>
          </button>
        </div>
      `;

      slot.querySelector('#btn-create-first-trip')?.addEventListener('click', () => {
        triggerHaptic('medium');
        openNewTripModal();
      });
      return;
    }

    slot.innerHTML = `
      <div class="flex items-center justify-between px-1">
        <h2 class="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Viajes de ${escapeHtml(currentGroupName)}
        </h2>
        <span class="text-xs font-bold text-brand-primary px-2 py-0.5 rounded-full bg-brand-primary/10">
          ${trips.length} ${trips.length === 1 ? 'viaje' : 'viajes'}
        </span>
      </div>

      <div class="grid grid-cols-1 gap-3">
        ${trips
          .map((trip) => {
            const meta = trip.metadatos;
            return `
              <div 
                data-trip-id="${trip.id}"
                class="trip-card p-4 rounded-3xl glass-panel shadow-dock hover:border-brand-primary/40 active:scale-[0.99] transition-all cursor-pointer flex flex-col gap-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-brand-primary/15 text-brand-primary flex items-center justify-center text-xl shrink-0">
                      🌍
                    </div>
                    <div>
                      <h3 class="text-sm font-extrabold text-text-primary leading-tight">
                        ${escapeHtml(meta.destino)}
                      </h3>
                      <p class="text-[0.75rem] text-text-secondary">
                        ${escapeHtml(meta.fecha_llegada)} &rarr; ${escapeHtml(meta.fecha_salida)} (${meta.duracion_dias} ${meta.duracion_dias === 1 ? 'día' : 'días'})
                      </p>
                    </div>
                  </div>

                  <span class="text-[0.7rem] font-bold px-2.5 py-1 rounded-full bg-status-online/15 text-status-online shrink-0">
                    ~${meta.presupuesto_estimado_por_persona || 0} € / pers.
                  </span>
                </div>

                <p class="text-xs text-text-secondary line-clamp-2">
                  ${escapeHtml(meta.resumen_estilo || 'Itinerario de viaje')}
                </p>

                <div class="flex items-center justify-between pt-2 border-t border-border-subtle text-[0.75rem]">
                  <span class="text-text-disabled">Por: ${escapeHtml(meta.created_by_name || 'Miembro')}</span>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      data-delete-trip-id="${trip.id}"
                      class="btn-delete-trip p-1 text-text-disabled hover:text-status-error transition-colors"
                      title="Eliminar viaje"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <span class="font-bold text-brand-primary flex items-center gap-1">
                      <span>Ver plan</span> &rarr;
                    </span>
                  </div>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;

    // Bind clicks en tarjetas de viaje
    slot.querySelectorAll('.trip-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        // Evitar clic si se pulsa borrar
        if ((e.target as HTMLElement).closest('.btn-delete-trip')) return;
        const tripId = (card as HTMLElement).dataset.tripId;
        const found = trips.find((t) => t.id === tripId);
        if (found) {
          triggerHaptic('light');
          selectedTrip = found;
          activeDayIndex = 0;
          renderContent();
          container.querySelector('#guia-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });

    // Bind borrar viaje
    slot.querySelectorAll('.btn-delete-trip').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const tripId = (btn as HTMLElement).dataset.deleteTripId;
        if (!tripId) return;

        if (!confirm('¿Eliminar este viaje para todo el grupo?')) return;

        try {
          triggerHaptic('medium');
          await guiaService.deleteTrip(activeGroupId, tripId);
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Error al eliminar el viaje');
        }
      });
    });
  }

  function renderTripDetail(slot: Element): void {
    if (!selectedTrip) return;
    const meta = selectedTrip.metadatos;
    const days = selectedTrip.plan_diario || [];
    const activeDay = days[activeDayIndex] || days[0];

    slot.innerHTML = `
      <!-- Cabecera de retorno -->
      <div class="flex items-center justify-between pb-1">
        <button
          id="btn-back-to-trips"
          type="button"
          class="h-8 px-3 rounded-full bg-surface-elevated text-text-primary text-xs font-bold hover:bg-surface-elevated/80 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span>&larr;</span>
          <span>Volver a viajes</span>
        </button>

        <span class="text-xs text-text-secondary font-mono">
          Creado por ${escapeHtml(meta.created_by_name || 'Miembro')}
        </span>
      </div>

      <!-- Hero Card del Viaje -->
      <div class="p-5 rounded-3xl glass-panel shadow-dock flex flex-col gap-2">
        <div class="flex items-start justify-between gap-3">
          <div>
            <span class="text-[0.7rem] uppercase font-bold tracking-widest text-brand-primary">Itinerario de Grupo</span>
            <h2 class="text-xl font-extrabold text-text-primary leading-tight mt-0.5">
              ${escapeHtml(meta.destino)}
            </h2>
            <p class="text-xs text-text-secondary mt-0.5">
              ${escapeHtml(meta.alojamiento_ubicacion || 'Alojamiento')} · ${meta.duracion_dias} días
            </p>
          </div>

          <div class="text-right">
            <span class="text-[0.7rem] text-text-disabled block">Presupuesto est.</span>
            <span class="text-base font-extrabold text-status-online font-mono">
              ${meta.presupuesto_estimado_por_persona || 0} €
            </span>
          </div>
        </div>

        <p class="text-xs text-text-secondary pt-2 border-t border-border-subtle leading-relaxed">
          ${escapeHtml(meta.resumen_estilo)}
        </p>
      </div>

      <!-- Selector de Días (Tabs Horizontales) -->
      ${
        days.length > 1
          ? `
        <div class="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
          ${days
            .map(
              (d, idx) => `
            <button
              type="button"
              data-day-index="${idx}"
              class="btn-day-tab px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
                idx === activeDayIndex
                  ? 'bg-brand-primary text-brand-on-primary'
                  : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
              }"
            >
              Día ${d.dia_numero}
            </button>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }

      <!-- Detalle del Día Activo -->
      ${
        activeDay
          ? `
        <div class="p-4 rounded-3xl glass-panel shadow-xs flex flex-col gap-3">
          <div class="flex items-center justify-between pb-2 border-b border-border-subtle">
            <div>
              <span class="text-xs font-extrabold text-brand-primary">DÍA ${activeDay.dia_numero}</span>
              <span class="text-xs text-text-secondary ml-2 font-mono">${escapeHtml(activeDay.fecha)}</span>
            </div>
            <p class="text-xs font-medium text-text-primary text-right max-w-[200px] truncate">
              ${escapeHtml(activeDay.descripcion_general_dia)}
            </p>
          </div>

          <!-- Franjas Horarias -->
          <div class="flex flex-col gap-3">
            <!-- Mañana -->
            ${renderTimeSlot('🌅 Mañana', activeDay.franjas.manana)}
            
            <!-- Mediodía -->
            ${renderTimeSlot('☀️ Mediodía', activeDay.franjas.medio_dia)}

            <!-- Tarde -->
            ${renderTimeSlot('🌇 Tarde', activeDay.franjas.tarde)}

            <!-- Noche -->
            ${renderTimeSlot('🌙 Noche', activeDay.franjas.noche)}
          </div>
        </div>
      `
          : '<div class="text-xs text-text-disabled text-center py-4">Sin datos de este día</div>'
      }
    `;

    // Bind botón volver
    slot.querySelector('#btn-back-to-trips')?.addEventListener('click', () => {
      triggerHaptic('light');
      selectedTrip = null;
      renderContent();
    });

    // Bind cambio de día
    slot.querySelectorAll('.btn-day-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number((btn as HTMLElement).dataset.dayIndex);
        if (!isNaN(idx) && idx !== activeDayIndex) {
          triggerHaptic('light');
          activeDayIndex = idx;
          renderTripDetail(slot);
        }
      });
    });
  }

  function renderTimeSlot(label: string, slot?: { actividades: string; logistica_transporte: string; sugerencia_gastronomica: string } | null): string {
    if (!slot) return '';
    return `
      <div class="p-3 rounded-2xl bg-surface-base border border-border-subtle flex flex-col gap-1.5 text-xs">
        <span class="font-bold text-text-primary flex items-center gap-1.5 text-[0.75rem]">
          ${label}
        </span>
        <p class="text-text-secondary leading-relaxed">
          ${escapeHtml(slot.actividades)}
        </p>
        
        ${
          slot.sugerencia_gastronomica
            ? `
          <div class="flex items-start gap-1.5 text-[0.7rem] text-status-online bg-status-online/5 px-2.5 py-1 rounded-xl">
            <span>🍽️</span>
            <span>${escapeHtml(slot.sugerencia_gastronomica)}</span>
          </div>
        `
            : ''
        }

        ${
          slot.logistica_transporte
            ? `
          <div class="flex items-start gap-1.5 text-[0.7rem] text-text-disabled px-1">
            <span>🚶</span>
            <span>${escapeHtml(slot.logistica_transporte)}</span>
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  function bindHeaderEvents(): void {
    container.querySelector('#btn-open-new-trip')?.addEventListener('click', () => {
      triggerHaptic('medium');
      openNewTripModal();
    });
  }

  function openNewTripModal(): void {
    const modalContainer = container.querySelector('#guia-modal-container');
    if (!modalContainer) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const tomorrowStr = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);

    modalContainer.innerHTML = `
      <div id="modal-new-trip-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
        <div class="w-full max-w-lg bg-surface-canvas border border-border-subtle rounded-t-3xl sm:rounded-3xl shadow-dock max-h-[90vh] flex flex-col overflow-hidden">
          
          <!-- Cabecera Modal -->
          <div class="p-4 border-b border-border-subtle flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-lg">🧭</span>
              <h3 class="text-sm font-extrabold text-text-primary">Planificar Viaje de Grupo</h3>
            </div>
            <button
              id="btn-close-new-trip"
              type="button"
              class="w-7 h-7 rounded-full bg-surface-elevated text-text-secondary hover:text-text-primary flex items-center justify-center text-sm font-bold"
            >
              &times;
            </button>
          </div>

          <!-- Formulario con scroll -->
          <form id="form-new-trip" class="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
            <div>
              <label class="block font-bold text-text-secondary mb-1">Destino *</label>
              <input
                type="text"
                id="trip-destino"
                required
                placeholder="Ej: Granada, Roma, Pirineos, Tokio..."
                class="w-full h-10 px-3.5 rounded-2xl bg-surface-base border border-border-subtle text-text-primary text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div>
              <label class="block font-bold text-text-secondary mb-1">Zona de Alojamiento (Opcional)</label>
              <input
                type="text"
                id="trip-alojamiento"
                placeholder="Ej: Centro histórico, Cerca de la estación..."
                class="w-full h-10 px-3.5 rounded-2xl bg-surface-base border border-border-subtle text-text-primary text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-text-secondary mb-1">Fecha Llegada</label>
                <input
                  type="date"
                  id="trip-llegada"
                  required
                  value="${todayStr}"
                  class="w-full h-10 px-3 rounded-2xl bg-surface-base border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>
              <div>
                <label class="block font-bold text-text-secondary mb-1">Fecha Salida</label>
                <input
                  type="date"
                  id="trip-salida"
                  required
                  value="${tomorrowStr}"
                  class="w-full h-10 px-3 rounded-2xl bg-surface-base border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            <!-- Preferencias de Viaje Rápidas -->
            <div class="p-3.5 rounded-2xl bg-surface-base border border-border-subtle flex flex-col gap-3">
              <span class="font-extrabold text-brand-primary text-[0.75rem] uppercase tracking-wider">
                Preferencias del Grupo
              </span>

              <!-- 1. Entorno -->
              <div>
                <div class="flex justify-between text-text-secondary mb-1">
                  <span>Entorno:</span>
                  <span id="label-pref-entorno" class="font-bold text-brand-primary">Equilibrado (3)</span>
                </div>
                <input type="range" id="pref-entorno" min="1" max="5" value="3" class="w-full accent-brand-primary cursor-pointer" />
                <div class="flex justify-between text-[0.65rem] text-text-disabled mt-0.5">
                  <span>🌲 Naturaleza</span>
                  <span>🏙️ Ciudad</span>
                </div>
              </div>

              <!-- 2. Ritmo -->
              <div>
                <div class="flex justify-between text-text-secondary mb-1">
                  <span>Ritmo de viaje:</span>
                  <span id="label-pref-ritmo" class="font-bold text-brand-primary">Tranquilo (2)</span>
                </div>
                <input type="range" id="pref-ritmo" min="1" max="5" value="2" class="w-full accent-brand-primary cursor-pointer" />
                <div class="flex justify-between text-[0.65rem] text-text-disabled mt-0.5">
                  <span>☕ Relax</span>
                  <span>⚡ Non-stop</span>
                </div>
              </div>

              <!-- 3. Gastronomía -->
              <div>
                <div class="flex justify-between text-text-secondary mb-1">
                  <span>Prioridad Gastronómica:</span>
                  <span id="label-pref-gastro" class="font-bold text-brand-primary">Alta (4)</span>
                </div>
                <input type="range" id="pref-gastro" min="1" max="5" value="4" class="w-full accent-brand-primary cursor-pointer" />
                <div class="flex justify-between text-[0.65rem] text-text-disabled mt-0.5">
                  <span>🥪 Rápido</span>
                  <span>🍷 Gourmet</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-trip"
              class="w-full h-11 rounded-full bg-brand-primary text-brand-on-primary font-bold text-xs hover:opacity-95 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 mt-1"
            >
              <span>Generar y Guardar Itinerario</span>
            </button>
          </form>

        </div>
      </div>
    `;

    // Sliders feedback
    const bindSlider = (id: string, labelId: string) => {
      const slider = modalContainer.querySelector(`#${id}`) as HTMLInputElement | null;
      const label = modalContainer.querySelector(`#${labelId}`) as HTMLElement | null;
      slider?.addEventListener('input', () => {
        if (label) label.textContent = `${slider.value}/5`;
      });
    };
    bindSlider('pref-entorno', 'label-pref-entorno');
    bindSlider('pref-ritmo', 'label-pref-ritmo');
    bindSlider('pref-gastro', 'label-pref-gastro');

    // Cerrar modal
    modalContainer.querySelector('#btn-close-new-trip')?.addEventListener('click', closeNewTripModal);
    modalContainer.querySelector('#modal-new-trip-backdrop')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'modal-new-trip-backdrop') closeNewTripModal();
    });

    // Enviar formulario
    modalContainer.querySelector('#form-new-trip')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSavingTrip) return;

      const destinoInput = (modalContainer.querySelector('#trip-destino') as HTMLInputElement).value.trim();
      const alojamientoInput = (modalContainer.querySelector('#trip-alojamiento') as HTMLInputElement).value.trim();
      const llegadaInput = (modalContainer.querySelector('#trip-llegada') as HTMLInputElement).value;
      const salidaInput = (modalContainer.querySelector('#trip-salida') as HTMLInputElement).value;

      if (!destinoInput) return;

      const submitBtn = modalContainer.querySelector('#btn-submit-trip') as HTMLButtonElement;
      isSavingTrip = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Diseñando itinerario...';

      try {
        const preferencias: TravelPreferences = {
          entorno_principal: Number((modalContainer.querySelector('#pref-entorno') as HTMLInputElement).value || 3),
          estilo_planificacion: 3,
          ritmo_viaje: Number((modalContainer.querySelector('#pref-ritmo') as HTMLInputElement).value || 3),
          enfoque_cultural_vs_ocio: 4,
          prioridad_gastronomica: Number((modalContainer.querySelector('#pref-gastro') as HTMLInputElement).value || 4),
          presupuesto_confort: 3,
          movilidad_transporte: 2,
          experiencia_social: 3,
          vida_nocturna_horario: 3,
          actividad_fisica: 2,
        };

        const newTripReq: NewTripRequest = {
          destino: destinoInput,
          alojamiento: alojamientoInput,
          fecha_llegada: llegadaInput,
          fecha_salida: salidaInput,
          preferencias,
        };

        const generatedTrip = generateGroupItinerary(
          newTripReq,
          activeGroupId,
          currentUser.uid,
          currentUser.display_name || 'Miembro'
        );

        await guiaService.createTrip(activeGroupId, generatedTrip);
        triggerHaptic('success');
        closeNewTripModal();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al generar el viaje');
      } finally {
        isSavingTrip = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Generar y Guardar Itinerario';
        }
      }
    });
  }

  function closeNewTripModal(): void {
    const modalContainer = container.querySelector('#guia-modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
  }

  function subscribeToTrips(): void {
    if (tripsUnsubscribe) {
      tripsUnsubscribe();
      tripsUnsubscribe = null;
    }

    if (!activeGroupId) {
      trips = [];
      renderContent();
      return;
    }

    tripsUnsubscribe = guiaService.subscribeToGroupTrips(
      activeGroupId,
      (groupTrips) => {
        trips = groupTrips;
        // Si teníamos un viaje seleccionado, refrescarlo con la versión en tiempo real
        if (selectedTrip) {
          selectedTrip = trips.find((t) => t.id === selectedTrip!.id) || null;
        }
        renderContent();
      },
      (err) => {
        console.error('Error al suscribir a viajes:', err);
      }
    );
  }

  // Inicialización
  renderViewRoot();

  if (groupService) {
    groupsUnsubscribe = groupService.subscribeToGroups((allGroups) => {
      accessibleGroups = groupService.getUserGroups(currentUser, allGroups);
      groupsLoaded = true;

      if (!activeGroupId || !accessibleGroups.some((g) => g.id === activeGroupId)) {
        const firstGuia = accessibleGroups.find((g) => g.guia_enabled);
        activeGroupId = firstGuia ? firstGuia.id : (accessibleGroups[0]?.id || '');
      }

      renderGroupSelector();
      renderContent();
      renderTabBar();
      subscribeToTrips();
    });
  } else {
    groupsLoaded = true;
    subscribeToTrips();
  }

  // Retorno de teardown
  return () => {
    if (groupsUnsubscribe) {
      groupsUnsubscribe();
      groupsUnsubscribe = null;
    }
    if (tripsUnsubscribe) {
      tripsUnsubscribe();
      tripsUnsubscribe = null;
    }
    if (cleanupTabBar) {
      cleanupTabBar();
      cleanupTabBar = null;
    }
  };
}
