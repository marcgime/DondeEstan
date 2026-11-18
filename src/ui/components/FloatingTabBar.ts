import { triggerHaptic } from '../utils/haptics';

export type FloatingTabId = 'map' | 'chat' | 'profile';

export interface FloatingTabBarOptions {
  activeTab: FloatingTabId;
  onNavigateTab?: (tab: FloatingTabId) => void;
  onActiveTabClick?: () => void;
  inactivityMs?: number;
  waterDurationMs?: number;
  animateOnMount?: boolean;
  zIndexClass?: string;
}

export const DEFAULT_TAB_INACTIVITY_MS = 4000;
export const DEFAULT_WATER_ANIMATION_MS = 500;

/**
 * Recuerda qué pestaña acaba de seleccionarse para que al montarse la nueva vista
 * su botón activo ejecute inmediatamente la onda efecto agua de 0,5 segundos.
 */
let pendingWaterAnimationTab: FloatingTabId | null = null;

export function resetFloatingTabBarState(): void {
  pendingWaterAnimationTab = null;
}

export function renderFloatingTabBar(
  container: HTMLElement,
  options: FloatingTabBarOptions
): () => void {
  const {
    activeTab,
    onNavigateTab,
    onActiveTabClick,
    inactivityMs = DEFAULT_TAB_INACTIVITY_MS,
    waterDurationMs = DEFAULT_WATER_ANIMATION_MS,
    animateOnMount = false,
    zIndexClass = 'z-30',
  } = options;

  let inactivityTimerId: ReturnType<typeof setTimeout> | null = null;
  let waterTimerId: ReturnType<typeof setTimeout> | null = null;

  const shouldAnimateActiveOnMount =
    animateOnMount || pendingWaterAnimationTab === activeTab;

  if (pendingWaterAnimationTab === activeTab) {
    pendingWaterAnimationTab = null;
  }

  function getTabButtonClass(tab: FloatingTabId): string {
    const isActive = tab === activeTab;
    const base = 'dock-tab-btn';
    if (!isActive) {
      return base;
    }
    const waterClass = shouldAnimateActiveOnMount ? ' dock-btn-water-animating' : '';
    return `${base} dock-tab-btn--active${waterClass}`;
  }

  container.innerHTML = `
    <nav
      id="floating-tab-nav"
      aria-label="Navegación principal"
      class="absolute inset-x-4 safe-dock-bottom ${zIndexClass} pointer-events-auto flex justify-center"
    >
      <div
        id="floating-tab-dock"
        class="floating-dock mx-auto rounded-full glass-dock shadow-dock flex items-center justify-center"
      >
        <!-- Map Tab -->
        <button
          type="button"
          id="nav-btn-map"
          data-tab="map"
          aria-label="Mapa"
          ${activeTab === 'map' ? 'aria-current="page"' : ''}
          class="${getTabButtonClass('map')}"
        >
          <span class="dock-water-effect" aria-hidden="true">
            <span class="dock-water-wave-primary"></span>
            <span class="dock-water-wave-secondary"></span>
            <span class="dock-water-ripple"></span>
          </span>
          <svg class="dock-tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span class="dock-tab-label">Mapa</span>
        </button>

        <!-- Chat Tab -->
        <button
          type="button"
          id="nav-btn-chat"
          data-tab="chat"
          aria-label="Chat"
          ${activeTab === 'chat' ? 'aria-current="page"' : ''}
          class="${getTabButtonClass('chat')}"
        >
          <span class="dock-water-effect" aria-hidden="true">
            <span class="dock-water-wave-primary"></span>
            <span class="dock-water-wave-secondary"></span>
            <span class="dock-water-ripple"></span>
          </span>
          <svg class="dock-tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span class="dock-tab-label">Chat</span>
        </button>

        <!-- Profile Tab -->
        <button
          type="button"
          id="nav-btn-profile"
          data-tab="profile"
          aria-label="Perfil"
          ${activeTab === 'profile' ? 'aria-current="page"' : ''}
          class="${getTabButtonClass('profile')}"
        >
          <span class="dock-water-effect" aria-hidden="true">
            <span class="dock-water-wave-primary"></span>
            <span class="dock-water-wave-secondary"></span>
            <span class="dock-water-ripple"></span>
          </span>
          <svg class="dock-tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span class="dock-tab-label">Perfil</span>
        </button>
      </div>
    </nav>
  `;

  const dockEl = container.querySelector('#floating-tab-dock') as HTMLElement | null;
  const tabButtons = Array.from(
    container.querySelectorAll<HTMLButtonElement>('.dock-tab-btn')
  );

  function clearInactivityTimer(): void {
    if (inactivityTimerId !== null) {
      clearTimeout(inactivityTimerId);
      inactivityTimerId = null;
    }
  }

  function clearWaterTimer(): void {
    if (waterTimerId !== null) {
      clearTimeout(waterTimerId);
      waterTimerId = null;
    }
  }

  function scheduleAutoCompact(): void {
    clearInactivityTimer();
    inactivityTimerId = setTimeout(() => {
      dockEl?.classList.add('floating-dock--compact');
    }, inactivityMs);
  }

  function wakeUpDock(): void {
    dockEl?.classList.remove('floating-dock--compact');
    scheduleAutoCompact();
  }

  function triggerWaterWaveOnButton(btn: HTMLButtonElement): void {
    clearWaterTimer();
    tabButtons.forEach((b) => b.classList.remove('dock-btn-water-animating'));
    btn.classList.add('dock-tab-btn--active');
    // Forzar reflow si se reactiva sobre el mismo botón
    void btn.offsetWidth;
    btn.classList.add('dock-btn-water-animating');

    waterTimerId = setTimeout(() => {
      btn.classList.remove('dock-btn-water-animating');
      waterTimerId = null;
    }, waterDurationMs);
  }

  // Si se montó con animación de agua activa (tras navegar a esta pestaña), fijar tras 0,5s
  if (shouldAnimateActiveOnMount) {
    const activeBtn = container.querySelector<HTMLButtonElement>(
      `.dock-tab-btn[data-tab="${activeTab}"]`
    );
    if (activeBtn) {
      waterTimerId = setTimeout(() => {
        activeBtn.classList.remove('dock-btn-water-animating');
        waterTimerId = null;
      }, waterDurationMs);
    }
  }

  // Iniciar cuenta atrás de 4 segundos para empequeñecer a solo logotipos
  scheduleAutoCompact();

  // Cualquier toque o foco en el dock lo expande y reinicia los 4 segundos
  const onDockInteract = (): void => {
    wakeUpDock();
  };

  dockEl?.addEventListener('pointerdown', onDockInteract);
  dockEl?.addEventListener('touchstart', onDockInteract, { passive: true });
  dockEl?.addEventListener('mouseenter', onDockInteract);
  dockEl?.addEventListener('focusin', onDockInteract);

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab') as FloatingTabId | null;
      if (!targetTab) return;

      triggerHaptic('light');
      wakeUpDock();

      if (targetTab === activeTab) {
        triggerWaterWaveOnButton(btn);
        if (onActiveTabClick) {
          onActiveTabClick();
        }
        return;
      }

      // Marcar que la pestaña destino debe iniciar con la onda de agua de 0,5s
      pendingWaterAnimationTab = targetTab;

      // Actualizar estado visual y lanzar onda de agua también en el DOM actual
      tabButtons.forEach((b) => {
        if (b !== btn) {
          b.classList.remove('dock-tab-btn--active', 'dock-btn-water-animating');
          b.removeAttribute('aria-current');
        }
      });
      btn.setAttribute('aria-current', 'page');
      triggerWaterWaveOnButton(btn);

      if (onNavigateTab) {
        onNavigateTab(targetTab);
      }
    });
  });

  return () => {
    clearInactivityTimer();
    clearWaterTimer();
    dockEl?.removeEventListener('pointerdown', onDockInteract);
    dockEl?.removeEventListener('touchstart', onDockInteract);
    dockEl?.removeEventListener('mouseenter', onDockInteract);
    dockEl?.removeEventListener('focusin', onDockInteract);
  };
}
