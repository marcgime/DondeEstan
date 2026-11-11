import './ui/theme/tokens.css';
import { getFirebaseServices, isFirebaseConfigured } from './core/firebase';
import { FamilyAuthService } from './auth/auth_service';
import { renderAuthView } from './auth/views/AuthView';
import { renderGatekeeperScreen } from './ui/components/GatekeeperScreen';
import { isUserApproved } from './auth/gatekeeper';
import type { UserProfile } from './auth/types';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { Unsubscribe } from 'firebase/firestore';

import { GeolocationTracker } from './location/tracker';
import { renderMapView } from './location/views/MapView';
import { FamilyChatService, renderChatView } from './chat';

const appContainer = document.getElementById('app');

if (!appContainer) {
  throw new Error('Elemento raíz #app no encontrado en el DOM.');
}

function init(): void {
  if (!isFirebaseConfigured()) {
    renderConfigNotice(appContainer!);
    return;
  }

  const { auth, db } = getFirebaseServices();
  const authService = new FamilyAuthService(auth, db);
  const chatService = new FamilyChatService(db);

  let profileUnsubscribe: Unsubscribe | null = null;
  let activeCleanup: (() => void) | null = null;
  let currentTracker: GeolocationTracker | null = null;
  let currentTab: 'map' | 'chat' | 'profile' = 'map';

  onAuthStateChanged(auth, async (user: User | null) => {
    if (profileUnsubscribe) {
      profileUnsubscribe();
      profileUnsubscribe = null;
    }
    if (activeCleanup) {
      activeCleanup();
      activeCleanup = null;
    }
    if (currentTracker) {
      currentTracker.stop();
      currentTracker = null;
    }

    if (!user) {
      currentTab = 'map';
      renderAuthView(appContainer!, {
        authService,
        onAuthenticated: () => {},
      });
      return;
    }

    // Usuario autenticado: escuchar su documento en Firestore
    profileUnsubscribe = authService.subscribeToUserProfile(
      user.uid,
      (profile) => {
        if (!profile || profile.status === 'pending_approval') {
          if (activeCleanup) {
            activeCleanup();
            activeCleanup = null;
          }
          renderGatekeeperScreen(appContainer!, {
            user: profile || {
              uid: user.uid,
              email: user.email || '',
              display_name: user.displayName || user.email || 'Familiar',
              role: 'member',
              status: 'pending_approval',
            },
            onLogout: async () => {
              await authService.logout();
            },
          });
          return;
        }

        if (profile && isUserApproved(profile)) {
          const activeUser = user;
          const approvedProfile: UserProfile = profile;

          if (!currentTracker) {
            currentTracker = new GeolocationTracker({
              uid: activeUser.uid,
              db,
            });
          }

          function renderTab(): void {
            if (activeCleanup) {
              activeCleanup();
              activeCleanup = null;
            }

            if (currentTab === 'map') {
              activeCleanup = renderMapView(appContainer!, {
                uid: activeUser.uid,
                db,
                tracker: currentTracker!,
                onNavigateTab: (tab) => {
                  currentTab = tab;
                  renderTab();
                },
                onLogout: async () => {
                  await authService.logout();
                },
              });
            } else if (currentTab === 'chat') {
              activeCleanup = renderChatView(appContainer!, {
                currentUser: {
                  uid: activeUser.uid,
                  name: approvedProfile.display_name,
                  photoUrl: approvedProfile.photo_url,
                },
                chatService,
                onNavigateTab: (tab) => {
                  currentTab = tab;
                  renderTab();
                },
                onLogout: async () => {
                  await authService.logout();
                },
              });
            } else {
              activeCleanup = renderProfileView(appContainer!, {
                profile: approvedProfile,
                onNavigateTab: (tab) => {
                  currentTab = tab;
                  renderTab();
                },
                onLogout: async () => {
                  await authService.logout();
                },
              });
            }
          }

          renderTab();
          return;
        }

        // Estado rechazado o no contemplado
        renderGatekeeperScreen(appContainer!, {
          user: profile,
          onLogout: async () => {
            await authService.logout();
          },
        });
      },
      (error) => {
        console.error('Error suscribiendo al perfil:', error);
      }
    );
  });
}

function renderProfileView(
  container: HTMLElement,
  options: {
    profile: UserProfile;
    onNavigateTab: (tab: 'map' | 'chat' | 'profile') => void;
    onLogout: () => Promise<void>;
  }
): () => void {
  const { profile, onNavigateTab, onLogout } = options;
  const initial = (profile.display_name || 'F')[0].toUpperCase();

  container.innerHTML = `
    <div class="relative h-full w-full flex flex-col bg-surface-canvas text-text-primary overflow-hidden">
      
      <!-- Top Header -->
      <header class="h-16 shrink-0 px-4 safe-top flex items-center justify-between border-b border-border-subtle bg-surface-glass backdrop-blur-xl z-20">
        <h1 class="text-sm font-bold text-text-primary">Mi Perfil Familiar</h1>
        <button 
          id="profile-btn-logout"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-card border border-border-subtle text-status-error text-xs font-semibold hover:bg-status-error/10 transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Cerrar Sesión</span>
        </button>
      </header>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-6 pb-28">
        
        <!-- Avatar Big -->
        <div class="relative mt-4">
          <div class="w-24 h-24 rounded-full border-4 border-brand-primary/20 bg-surface-card overflow-hidden flex items-center justify-center text-3xl font-extrabold text-brand-primary shadow-card">
            ${
              profile.photo_url
                ? `<img src="${profile.photo_url}" alt="${profile.display_name}" class="w-full h-full object-cover" />`
                : initial
            }
          </div>
          <span class="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-status-online border-2 border-surface-canvas flex items-center justify-center text-white" title="Conectado">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        </div>

        <div class="text-center">
          <h2 class="text-xl font-extrabold text-text-primary">${profile.display_name}</h2>
          <p class="text-xs text-text-secondary mt-0.5">${profile.email}</p>
          <span class="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
            profile.role === 'admin'
              ? 'bg-brand-primary text-brand-on-primary'
              : 'bg-surface-elevated text-text-secondary'
          }">
            ${profile.role === 'admin' ? 'Administrador Familiar' : 'Miembro Familiar'}
          </span>
        </div>

        <!-- Info Cards -->
        <div class="w-full max-w-sm flex flex-col gap-3 mt-2">
          <div class="p-4 rounded-2xl bg-surface-glass border border-surface-glass-border shadow-xs flex items-center justify-between text-xs">
            <span class="font-bold text-text-secondary">Estado de cuenta</span>
            <span class="text-status-online font-bold uppercase tracking-wider">Activa y Aprobada</span>
          </div>

          <div class="p-4 rounded-2xl bg-surface-glass border border-surface-glass-border shadow-xs flex items-center justify-between text-xs">
            <span class="font-bold text-text-secondary">Privacidad</span>
            <span class="text-brand-primary font-bold">Cero Telemetría</span>
          </div>

          <div class="p-4 rounded-2xl bg-surface-glass border border-surface-glass-border shadow-xs flex items-center justify-between text-xs">
            <span class="font-bold text-text-secondary">Núcleo</span>
            <span class="text-text-primary font-bold">Máximo 8 personas</span>
          </div>
        </div>

      </div>

      <!-- DS-NAV-DOCK: Bottom Floating Glass Navigation -->
      <nav class="absolute inset-x-4 bottom-4 z-30 safe-bottom">
        <div class="max-w-xs mx-auto h-14 rounded-full bg-surface-glass backdrop-blur-2xl border border-surface-glass-border shadow-dock flex items-center justify-around px-2">
          
          <!-- Map Tab -->
          <button 
            id="nav-profile-map" 
            class="flex items-center gap-1.5 px-4 py-2 rounded-full text-text-secondary hover:text-text-primary text-xs font-bold transition-all"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>Mapa</span>
          </button>

          <!-- Chat Tab -->
          <button 
            id="nav-profile-chat" 
            class="flex items-center gap-1.5 px-4 py-2 rounded-full text-text-secondary hover:text-text-primary text-xs font-bold transition-all"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Chat</span>
          </button>

          <!-- Settings Tab (Active) -->
          <button class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-primary text-brand-on-primary text-xs font-bold shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Perfil</span>
          </button>

        </div>
      </nav>

    </div>
  `;

  container.querySelector('#nav-profile-map')?.addEventListener('click', () => {
    onNavigateTab('map');
  });

  container.querySelector('#nav-profile-chat')?.addEventListener('click', () => {
    onNavigateTab('chat');
  });

  container.querySelector('#profile-btn-logout')?.addEventListener('click', async () => {
    await onLogout();
  });

  return () => {};
}

function renderConfigNotice(container: HTMLElement): void {
  container.innerHTML = `
    <div class="h-full w-full flex flex-col justify-center items-center p-6 bg-surface-canvas text-text-primary text-center">
      <div class="w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-4">
        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h1 class="text-xl font-bold mb-2">Configuración Inicial Requerida</h1>
      <p class="text-xs text-text-secondary max-w-sm mb-6 leading-relaxed">
        Configura las credenciales de tu proyecto Firebase Spark en el archivo <code class="bg-surface-base px-2 py-1 rounded-md font-mono text-brand-primary">.env</code> para habilitar la autenticación familiar.
      </p>
    </div>
  `;
}

init();
