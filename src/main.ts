import './ui/theme/tokens.css';
import { getFirebaseServices, isFirebaseConfigured } from './core/firebase';
import { FamilyAuthService } from './auth/auth_service';
import { renderAuthView } from './auth/views/AuthView';
import { renderGatekeeperScreen } from './ui/components/GatekeeperScreen';
import { isUserApproved } from './auth/gatekeeper';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { Unsubscribe } from 'firebase/firestore';

import { GeolocationTracker } from './location/tracker';
import { renderMapView } from './location/views/MapView';

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
  let profileUnsubscribe: Unsubscribe | null = null;
  let activeCleanup: (() => void) | null = null;

  onAuthStateChanged(auth, async (user: User | null) => {
    if (profileUnsubscribe) {
      profileUnsubscribe();
      profileUnsubscribe = null;
    }
    if (activeCleanup) {
      activeCleanup();
      activeCleanup = null;
    }

    if (!user) {
      renderAuthView(appContainer!, {
        authService,
        onAuthenticated: () => {
          // El listener de onAuthStateChanged se disparará automáticamente
        },
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

        if (isUserApproved(profile)) {
          if (!activeCleanup) {
            const tracker = new GeolocationTracker({
              uid: user.uid,
              db,
            });
            activeCleanup = renderMapView(appContainer!, {
              uid: user.uid,
              db,
              tracker,
            });
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
      <div class="p-4 rounded-2xl bg-surface-base border border-border-subtle text-left max-w-sm w-full font-mono text-[11px] text-text-secondary">
        VITE_FIREBASE_API_KEY=...<br/>
        VITE_FIREBASE_PROJECT_ID=...<br/>
        VITE_FIREBASE_AUTH_DOMAIN=...
      </div>
    </div>
  `;
}

init();

