import type { GuiaService } from '../guia_service';
import type { Group, GroupService } from '../../admin';
import type { UserProfile } from '../../auth/types';
import { renderFloatingTabBar, type FloatingTabId } from '../../ui/components/FloatingTabBar';
import { triggerHaptic } from '../../ui/utils/haptics';

export interface GuiaViewOptions {
  guiaService?: GuiaService;
  groupService?: GroupService;
  currentUser: UserProfile;
  initialGroupId?: string;
  onNavigateTab: (tab: FloatingTabId) => void;
  onLogout?: () => Promise<void>;
  remoteUrl?: string;
  localFallbackUrl?: string;
}

const DEFAULT_GUIA_REMOTE_URL = 'https://guia.marcgime.workers.dev/';
const DEFAULT_GUIA_LOCAL_URL = '/guia-app/index.html';

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
  const {
    groupService,
    onNavigateTab,
    remoteUrl = DEFAULT_GUIA_REMOTE_URL,
    localFallbackUrl = DEFAULT_GUIA_LOCAL_URL,
  } = options;

  let accessibleGroups: Group[] = [];
  let activeGroupId: string = options.initialGroupId || '';
  let groupsLoaded = !groupService;
  let currentIframeUrl = remoteUrl;
  let isUsingLocalFallback = false;

  let groupsUnsubscribe: (() => void) | null = null;
  let cleanupTabBar: (() => void) | null = null;

  function renderViewRoot(): void {
    container.innerHTML = `
      <div id="guia-view-root" class="relative h-full w-full flex flex-col bg-surface-canvas text-text-primary overflow-hidden">
        
        <!-- Header minimalista de GuIA -->
        <header class="ios-nav-bar safe-header-top flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface-elevated/90 backdrop-blur-md z-20">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xl">🧭</span>
            <div>
              <h1 class="text-sm font-extrabold tracking-tight text-text-primary flex items-center gap-1.5 leading-none">
                <span>GuIA</span>
                <span id="guia-mode-badge" class="text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${
                  isUsingLocalFallback ? 'bg-amber-500/15 text-amber-600' : 'bg-brand-primary/15 text-brand-primary'
                }">
                  ${isUsingLocalFallback ? 'Local' : 'Live'}
                </span>
              </h1>
              <p class="text-[0.65rem] text-text-secondary truncate mt-0.5" id="guia-group-subtitle">
                Cargando grupo...
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-1.5 shrink-0">
            <!-- Selector de Grupo si hay varios -->
            <div id="guia-group-selector-slot" class="flex items-center"></div>

            <!-- Botón Recargar -->
            <button
              id="btn-reload-guia"
              type="button"
              title="Recargar GuIA"
              aria-label="Recargar GuIA"
              class="w-8 h-8 rounded-full bg-surface-base border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-elevated active:scale-95 transition-all"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <!-- Botón Abrir en ventana externa -->
            <a
              id="btn-external-guia"
              href="${escapeHtml(currentIframeUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir en ventana completa"
              aria-label="Abrir en ventana completa"
              class="w-8 h-8 rounded-full bg-surface-base border border-border-subtle flex items-center justify-center text-text-secondary hover:text-brand-primary hover:bg-surface-elevated active:scale-95 transition-all"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </header>

        <!-- Contenedor del Iframe Embebido -->
        <main class="relative flex-1 w-full h-full overflow-hidden bg-slate-50">
          <!-- Spinner de Carga -->
          <div
            id="guia-loading-overlay"
            class="absolute inset-0 flex flex-col items-center justify-center bg-surface-canvas/90 backdrop-blur-xs z-10 transition-opacity duration-300"
          >
            <div class="w-10 h-10 rounded-full border-3 border-brand-primary border-t-transparent animate-spin mb-3"></div>
            <p class="text-xs font-bold text-text-primary">Iniciando aplicación GuIA...</p>
            <p class="text-[0.7rem] text-text-secondary mt-1">Planificador inteligente de viajes</p>
          </div>

          <!-- Iframe embebido con GuIA real -->
          <iframe
            id="guia-app-iframe"
            src="${escapeHtml(currentIframeUrl)}"
            title="GuIA Travel Application"
            class="w-full h-full border-0 pb-16"
            allow="geolocation; camera; microphone; clipboard-write; display-capture"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
            loading="eager"
          ></iframe>
        </main>

        <!-- Dock Flotante Inferior -->
        <div id="guia-dock-slot"></div>
      </div>
    `;

    renderGroupSelector();
    renderTabBar();
    bindIframeEvents();
  }

  function renderGroupSelector(): void {
    const slot = container.querySelector('#guia-group-selector-slot');
    const subtitle = container.querySelector('#guia-group-subtitle');
    if (!slot) return;

    const currentGroup = accessibleGroups.find((g) => g.id === activeGroupId) || accessibleGroups[0];
    const groupName = currentGroup ? currentGroup.name : 'Grupo activo';

    if (subtitle) {
      subtitle.textContent = `Grupo: ${groupName}`;
    }

    if (accessibleGroups.length <= 1) {
      slot.innerHTML = '';
      return;
    }

    slot.innerHTML = `
      <select
        id="select-guia-group"
        class="h-8 px-2.5 rounded-full bg-surface-base border border-border-subtle text-[0.72rem] font-bold text-text-primary focus:outline-none focus:border-brand-primary cursor-pointer truncate max-w-[130px]"
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
        renderGroupSelector();
        notifyIframeGroupChange();
      }
    });
  }

  function bindIframeEvents(): void {
    const iframe = container.querySelector('#guia-app-iframe') as HTMLIFrameElement | null;
    const loadingOverlay = container.querySelector('#guia-loading-overlay') as HTMLElement | null;
    const reloadBtn = container.querySelector('#btn-reload-guia') as HTMLButtonElement | null;
    const externalLink = container.querySelector('#btn-external-guia') as HTMLAnchorElement | null;

    if (!iframe) return;

    let loadTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      // Si tras 8 segundos la URL remota no ha cargado, conmutamos automáticamente al fallback local
      if (!isUsingLocalFallback) {
        console.warn('[GuiaView] Tiempo de espera agotado para la URL remota. Conmutando al bundle local...');
        switchToLocalFallback();
      }
    }, 8000);

    iframe.addEventListener('load', () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        loadTimeout = null;
      }
      if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
          loadingOverlay.style.display = 'none';
        }, 300);
      }
    });

    iframe.addEventListener('error', () => {
      if (!isUsingLocalFallback) {
        console.warn('[GuiaView] Error cargando URL remota. Conmutando al bundle local...');
        switchToLocalFallback();
      }
    });

    reloadBtn?.addEventListener('click', () => {
      triggerHaptic('light');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
      }
      if (iframe) {
        iframe.src = currentIframeUrl;
      }
    });

    function switchToLocalFallback(): void {
      isUsingLocalFallback = true;
      currentIframeUrl = localFallbackUrl;
      if (iframe) {
        iframe.src = localFallbackUrl;
      }
      if (externalLink) {
        externalLink.href = localFallbackUrl;
      }
      const badge = container.querySelector('#guia-mode-badge');
      if (badge) {
        badge.className = 'text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600';
        badge.textContent = 'Local';
      }
    }
  }

  function notifyIframeGroupChange(): void {
    const iframe = container.querySelector('#guia-app-iframe') as HTMLIFrameElement | null;
    if (!iframe || !iframe.contentWindow) return;

    const currentGroup = accessibleGroups.find((g) => g.id === activeGroupId);
    try {
      iframe.contentWindow.postMessage(
        {
          type: 'DONDE_ESTAN_GROUP_CHANGE',
          groupId: activeGroupId,
          groupName: currentGroup?.name || '',
        },
        '*'
      );
    } catch {
      // PostMessage silencioso si el iframe tiene origen cruzado
    }
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
        const iframe = container.querySelector('#guia-app-iframe') as HTMLIFrameElement | null;
        try {
          iframe?.contentWindow?.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
          // Ignorar si el iframe tiene origen cruzado
        }
      },
    });
  }

  function subscribeToGroups(): void {
    if (!groupService) {
      groupsLoaded = true;
      renderViewRoot();
      return;
    }

    groupsUnsubscribe = groupService.subscribeToGroups((groups: Group[]) => {
      accessibleGroups = groups;
      groupsLoaded = true;

      if (!activeGroupId && accessibleGroups.length > 0) {
        const enabledGroup = accessibleGroups.find((g) => g.guia_enabled);
        activeGroupId = (enabledGroup || accessibleGroups[0]).id;
      }

      renderGroupSelector();
      renderTabBar();
    });
  }

  // Inicializar vista y subscripciones
  renderViewRoot();
  subscribeToGroups();

  return () => {
    if (groupsUnsubscribe) {
      groupsUnsubscribe();
      groupsUnsubscribe = null;
    }
    if (cleanupTabBar) {
      cleanupTabBar();
      cleanupTabBar = null;
    }
  };
}
