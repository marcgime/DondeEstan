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
import { ProfileService, renderProfileView } from './profile';
import { AdminService, renderAdminView } from './admin';
import { registerServiceWorker } from './core/pwa';
import { checkAndRenderIosInstallPrompt } from './ui/components/PwaInstallPrompt';

const appContainer = document.getElementById('app');

if (!appContainer) {
  throw new Error('Elemento raíz #app no encontrado en el DOM.');
}

function init(): void {
  registerServiceWorker();

  if (!isFirebaseConfigured()) {
    renderConfigNotice(appContainer!);
    return;
  }

  const { auth, db } = getFirebaseServices();
  const authService = new FamilyAuthService(auth, db);
  const chatService = new FamilyChatService(db);
  const profileService = new ProfileService(db);
  const adminService = new AdminService(db);

  let profileUnsubscribe: Unsubscribe | null = null;
  let activeCleanup: (() => void) | null = null;
  let currentTracker: GeolocationTracker | null = null;
  let currentTab: 'map' | 'chat' | 'profile' = 'map';
  let isAppInitialized = false;
  let latestProfile: UserProfile | null = null;

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
    isAppInitialized = false;
    latestProfile = null;

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
          isAppInitialized = false;
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
          latestProfile = profile;
          const activeUser = user;

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

            const currentProfile: UserProfile = (latestProfile || profile) as UserProfile;

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
                  name: currentProfile.display_name,
                  photoUrl: currentProfile.photo_url,
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
                profile: currentProfile,
                profileService,
                onNavigateTab: (tab) => {
                  currentTab = tab;
                  renderTab();
                },
                onOpenAdminPanel:
                  currentProfile.role === 'admin'
                    ? () => {
                        if (activeCleanup) {
                          activeCleanup();
                          activeCleanup = null;
                        }
                        activeCleanup = renderAdminView(appContainer!, {
                          adminService,
                          currentAdminUid: activeUser.uid,
                          onClose: () => {
                            renderTab();
                          },
                        });
                      }
                    : undefined,
                onLogout: async () => {
                  await authService.logout();
                },
              });
            }

            // Comprobar si se debe mostrar el aviso didáctico de instalación PWA en iOS
            checkAndRenderIosInstallPrompt(appContainer!);
          }

          // Solo renderizar la vista al inicio de la sesión aprobada o si no está inicializada.
          // Evita el bucle de desmontaje y reconstrucción del mapa cada vez que el GPS actualiza el perfil en Firestore.
          if (!isAppInitialized) {
            isAppInitialized = true;
            renderTab();
          }
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
