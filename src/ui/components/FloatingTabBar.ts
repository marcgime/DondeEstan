import { triggerHaptic } from '../utils/haptics';

export type FloatingTabId = 'map' | 'guia' | 'chat' | 'profile';

export interface FloatingTabBarOptions {
  activeTab: FloatingTabId;
  showGuiaTab?: boolean;
  chatUnreadCount?: number;
  onNavigateTab?: (tab: FloatingTabId) => void;
  onActiveTabClick?: () => void;
  inactivityMs?: number;
  zIndexClass?: string;
}

export const DEFAULT_TAB_INACTIVITY_MS = 4000;

let globalChatUnreadCount = 0;
const unreadListeners = new Set<(count: number) => void>();

export function getGlobalChatUnreadCount(): number {
  return globalChatUnreadCount;
}

export function setGlobalChatUnreadCount(count: number): void {
  const normalized = Math.max(0, Math.floor(count));
  if (normalized === globalChatUnreadCount) return;
  globalChatUnreadCount = normalized;
  unreadListeners.forEach((listener) => listener(globalChatUnreadCount));
}

export function subscribeChatUnreadCount(listener: (count: number) => void): () => void {
  unreadListeners.add(listener);
  return () => {
    unreadListeners.delete(listener);
  };
}

export function formatUnreadBadgeCount(count: number): string {
  if (count <= 0) return '';
  return count > 99 ? '99+' : String(count);
}

export function renderFloatingTabBar(
  container: HTMLElement,
  options: FloatingTabBarOptions
): () => void {
  const {
    activeTab,
    showGuiaTab = false,
    chatUnreadCount,
    onNavigateTab,
    onActiveTabClick,
    inactivityMs = DEFAULT_TAB_INACTIVITY_MS,
    zIndexClass = 'z-30',
  } = options;

  // Si entramos en el menú de chat y no se forzó un contador explícito, limpiar el contador global
  if (activeTab === 'chat' && chatUnreadCount === undefined && globalChatUnreadCount > 0) {
    setGlobalChatUnreadCount(0);
  }

  const effectiveUnreadCount =
    activeTab === 'chat'
      ? 0
      : chatUnreadCount !== undefined
      ? Math.max(0, Math.floor(chatUnreadCount))
      : globalChatUnreadCount;

  let inactivityTimerId: ReturnType<typeof setTimeout> | null = null;

  function getTabButtonClass(tab: FloatingTabId): string {
    const isActive = tab === activeTab;
    return isActive ? 'dock-tab-btn dock-tab-btn--active' : 'dock-tab-btn';
  }

  function renderBadgeHtml(count: number): string {
    if (count <= 0 || activeTab === 'chat') return '';
    const label = formatUnreadBadgeCount(count);
    return `<span id="chat-unread-badge" class="dock-tab-badge" aria-label="${count} mensajes nuevos">${label}</span>`;
  }

  container.innerHTML = `
    <nav
      id="floating-tab-nav"
      aria-label="Navegación principal"
      class="absolute inset-x-4 safe-dock-bottom ${zIndexClass} pointer-events-auto flex justify-center"
    >
      <div
        id="floating-tab-dock"
        class="floating-dock ${showGuiaTab ? 'floating-dock--4items' : ''} mx-auto rounded-full glass-dock shadow-dock flex items-center justify-center"
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
          <svg class="dock-tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span class="dock-tab-label">Mapa</span>
        </button>

        ${
          showGuiaTab
            ? `
        <!-- GuIA Tab -->
        <button
          type="button"
          id="nav-btn-guia"
          data-tab="guia"
          aria-label="GuIA"
          ${activeTab === 'guia' ? 'aria-current="page"' : ''}
          class="${getTabButtonClass('guia')}"
        >
          <svg class="dock-tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.5 8.5l-2.5 6-6 2.5 2.5-6 6-2.5z" />
          </svg>
          <span class="dock-tab-label">GuIA</span>
        </button>
        `
            : ''
        }

        <!-- Chat Tab -->
        <button
          type="button"
          id="nav-btn-chat"
          data-tab="chat"
          aria-label="Chat"
          ${activeTab === 'chat' ? 'aria-current="page"' : ''}
          class="${getTabButtonClass('chat')}"
        >
          <svg class="dock-tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span class="dock-tab-label">Chat</span>
          <span id="chat-unread-badge-slot">${renderBadgeHtml(effectiveUnreadCount)}</span>
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
          <svg class="dock-tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span class="dock-tab-label">Perfil</span>
        </button>
      </div>
    </nav>
  `;

  const dockEl = container.querySelector('#floating-tab-dock') as HTMLElement | null;
  const badgeSlotEl = container.querySelector('#chat-unread-badge-slot') as HTMLElement | null;
  const tabButtons = Array.from(
    container.querySelectorAll<HTMLButtonElement>('.dock-tab-btn')
  );

  // Suscribirse a cambios reactivos del contador de mensajes no leídos
  const unsubscribeUnread =
    chatUnreadCount === undefined
      ? subscribeChatUnreadCount((newCount) => {
          if (badgeSlotEl) {
            badgeSlotEl.innerHTML = renderBadgeHtml(newCount);
          }
        })
      : null;

  function clearInactivityTimer(): void {
    if (inactivityTimerId !== null) {
      clearTimeout(inactivityTimerId);
      inactivityTimerId = null;
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

  // Iniciar cuenta atrás de 4 segundos para empequeñecer a solo logotipos
  scheduleAutoCompact();

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      const targetTab = btn.getAttribute('data-tab') as FloatingTabId | null;
      if (!targetTab) return;

      triggerHaptic('light');
      wakeUpDock();

      if (targetTab === 'chat') {
        setGlobalChatUnreadCount(0);
      }

      if (targetTab === activeTab) {
        if (onActiveTabClick) {
          onActiveTabClick();
        }
        return;
      }

      if (onNavigateTab) {
        onNavigateTab(targetTab);
      }
    });
  });

  // Si el usuario toca el contenedor del dock fuera de un botón, expandir al terminar el click
  const onDockClick = (): void => {
    wakeUpDock();
  };

  dockEl?.addEventListener('click', onDockClick);

  return () => {
    clearInactivityTimer();
    if (unsubscribeUnread) {
      unsubscribeUnread();
    }
    dockEl?.removeEventListener('click', onDockClick);
  };
}
