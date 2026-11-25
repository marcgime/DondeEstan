import type { GuiaService } from '../guia_service';
import type { Group, GroupService } from '../../admin';
import type { UserProfile } from '../../auth/types';
import { renderFloatingTabBar, type FloatingTabId } from '../../ui/components/FloatingTabBar';

export interface GuiaViewOptions {
  guiaService?: GuiaService;
  groupService?: GroupService;
  currentUser: UserProfile;
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
    currentUser,
    onNavigateTab,
    remoteUrl = DEFAULT_GUIA_REMOTE_URL,
    localFallbackUrl = DEFAULT_GUIA_LOCAL_URL,
  } = options;

  let accessibleGroups: Group[] = [];
  let groupsLoaded = !groupService;
  let currentIframeUrl = remoteUrl;
  let isUsingLocalFallback = false;

  let groupsUnsubscribe: (() => void) | null = null;
  let cleanupTabBar: (() => void) | null = null;

  function renderViewRoot(): void {
    container.innerHTML = `
      <div id="guia-view-root" class="relative h-full w-full flex flex-col bg-surface-canvas text-text-primary overflow-hidden safe-header-top">
        <!-- Contenedor del Iframe Embebido a pantalla completa (sin barra superior redundante) -->
        <main class="relative flex-1 w-full h-full overflow-hidden bg-surface-canvas">
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

    renderTabBar();
    bindIframeEvents();
  }

  function bindIframeEvents(): void {
    const iframe = container.querySelector('#guia-app-iframe') as HTMLIFrameElement | null;
    const loadingOverlay = container.querySelector('#guia-loading-overlay') as HTMLElement | null;

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

    function switchToLocalFallback(): void {
      isUsingLocalFallback = true;
      currentIframeUrl = localFallbackUrl;
      if (iframe) {
        iframe.src = localFallbackUrl;
      }
    }
  }

  function renderTabBar(): void {
    const dockSlot = container.querySelector('#guia-dock-slot') as HTMLElement | null;
    if (!dockSlot) return;

    if (cleanupTabBar) {
      cleanupTabBar();
      cleanupTabBar = null;
    }

    // Acceso único a GuIA si al menos uno de los grupos accesibles del usuario tiene GuIA habilitado
    if (groupsLoaded) {
      const anyGuia = accessibleGroups.some((g) => g.guia_enabled);
      if (groupService && !anyGuia) {
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
      accessibleGroups = groupService.getUserGroups(currentUser, groups);
      groupsLoaded = true;
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
