import './ui/theme/tokens.css';
import { initUiScale, applyUiScale, isValidUiScale } from './ui/theme/ui_scale';
import { getFirebaseServices, isFirebaseConfigured } from './core/firebase';
import { FamilyAuthService } from './auth/auth_service';
import { renderAuthView } from './auth/views/AuthView';
import { renderGatekeeperScreen } from './ui/components/GatekeeperScreen';
import { isUserApproved, shouldShowGatekeeper } from './auth/gatekeeper';
import type { UserProfile } from './auth/types';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { Unsubscribe } from 'firebase/firestore';

import { GeolocationTracker } from './location/tracker';
import { renderMapView } from './location/views/MapView';
import {
  FamilyChatService,
  ChatNotificationMonitor,
  setStoredChatNotificationsEnabled,
  syncUserWebPushSubscription,
  renderChatView,
} from './chat';
import { ProfileService, renderProfileView } from './profile';
import { AdminService, GroupService, renderAdminView } from './admin';
import { GuiaService, renderGuiaView } from './guia';
import { setGlobalChatUnreadCount, type FloatingTabId } from './ui/components/FloatingTabBar';
import { registerServiceWorker, clearAppBadge } from './core/pwa';
import { checkAndRenderIosInstallPrompt } from './ui/components/PwaInstallPrompt';

const appContainer = document.getElementById('app');

if (!appContainer) {
  throw new Error('Elemento raíz #app no encontrado en el DOM.');
}

function init(): void {
  initUiScale();
  registerServiceWorker();

  if (!isFirebaseConfigured()) {
    renderConfigNotice(appContainer!);
    return;
  }

  const { auth, db } = getFirebaseServices();
  const authService = new FamilyAuthService(auth, db);
  const chatService = new FamilyChatService(db);
  const groupService = new GroupService(db);
  const profileService = new ProfileService(db);
  const adminService = new AdminService(db);
  const guiaService = new GuiaService(db);

  let profileUnsubscribe: Unsubscribe | null = null;
  let activeCleanup: (() => void) | null = null;
  let currentTracker: GeolocationTracker | null = null;
  let chatMonitor: ChatNotificationMonitor | null = null;
  let currentTab: FloatingTabId = 'map';
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
    if (chatMonitor) {
      chatMonitor.stop();
      chatMonitor = null;
    }
    setGlobalChatUnreadCount(0);
    void clearAppBadge();
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
        if (!profile) {
          if (authService.isRegisteringInProgress()) {
            return;
          }
          isAppInitialized = false;
          if (activeCleanup) {
            activeCleanup();
            activeCleanup = null;
          }
          if (currentTracker) {
            currentTracker.stop();
            currentTracker = null;
          }
          void authService.purgeCurrentUserAuth(user);
          return;
        }

        if (shouldShowGatekeeper(profile) || !isUserApproved(profile)) {
          isAppInitialized = false;
          if (activeCleanup) {
            activeCleanup();
            activeCleanup = null;
          }
          renderGatekeeperScreen(appContainer!, {
            user: profile,
            onLogout: async () => {
              await authService.logout();
            },
            onCheckVerification: async () => {
              return authService.checkEmailVerifiedAndPromote(user);
            },
            onResendVerification: async () => {
              return authService.resendVerificationEmail(user);
            },
          });
          return;
        }

        if (profile && isUserApproved(profile)) {
          latestProfile = profile;
          if (isValidUiScale(profile.ui_scale)) {
            applyUiScale(profile.ui_scale);
          }
          if (typeof profile.chat_notifications_enabled === 'boolean') {
            setStoredChatNotificationsEnabled(profile.chat_notifications_enabled);
          }
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

            if (currentTab === 'chat') {
              chatMonitor?.markAllAsRead();
              setGlobalChatUnreadCount(0);
              void clearAppBadge();
            }

            // Aplicar animación suave de entrada
            appContainer!.classList.remove('view-enter');
            void appContainer!.offsetWidth; // Force reflow
            appContainer!.classList.add('view-enter');

            const currentProfile: UserProfile = (latestProfile || profile) as UserProfile;

            if (currentTab === 'map') {
              activeCleanup = renderMapView(appContainer!, {
                uid: activeUser.uid,
                db,
                tracker: currentTracker!,
                groupService,
                currentUser: currentProfile,
                onNavigateTab: (tab) => {
                  currentTab = tab;
                  renderTab();
                },
                onLogout: async () => {
                  await authService.logout();
                },
              });
            } else if (currentTab === 'guia') {
              activeCleanup = renderGuiaView(appContainer!, {
                guiaService,
                groupService,
                currentUser: currentProfile,
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
                groupService,
                userProfile: currentProfile,
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
                groupService,
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
                          groupService,
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

          if (!chatMonitor) {
            chatMonitor = new ChatNotificationMonitor({
              db,
              groupService,
              getCurrentUser: () => latestProfile || profile,
              getCurrentTab: () => currentTab,
              onOpenChatTab: () => {
                if (currentTab !== 'chat') {
                  currentTab = 'chat';
                  renderTab();
                }
              },
            });
            chatMonitor.start();
            void syncUserWebPushSubscription(db, profile);
          }

          if (!isAppInitialized) {
            isAppInitialized = true;
            renderTab();

            if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
              navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'OPEN_CHAT_TAB' && isAppInitialized) {
                  currentTab = 'chat';
                  renderTab();
                }
              });
            }
          }
        }
      },
      (error) => {
        console.error('Error al escuchar el perfil del usuario:', error);
      }
    );
  });
}

function renderConfigNotice(container: HTMLElement): void {
  container.innerHTML = `
    <div class="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-surface-canvas text-text-primary safe-top safe-bottom">
      <div class="w-16 h-16 mb-4 rounded-full bg-status-warning/10 text-status-warning flex items-center justify-center">
        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 class="text-xl font-bold mb-2 font-sans">Firebase No Configurado</h1>
      <p class="text-sm text-text-secondary max-w-sm mb-6 leading-relaxed">
        Las variables de entorno de Firebase no están disponibles. Revisa la configuración de Cloudflare Workers o el archivo .env.local.
      </p>
      <div class="p-3 rounded-2xl bg-surface-base border border-border-subtle text-xs font-mono text-text-disabled">
        VITE_FIREBASE_API_KEY no detectada
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', init);
