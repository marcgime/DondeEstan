import './ui/theme/tokens.css';
import { getFirebaseServices, isFirebaseConfigured } from './core/firebase';
import { FamilyAuthService } from './auth/auth_service';
import { renderAuthView } from './auth/views/AuthView';
import { renderGatekeeperScreen } from './ui/components/GatekeeperScreen';
import { isUserApproved } from './auth/gatekeeper';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { Unsubscribe } from 'firebase/firestore';

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

  onAuthStateChanged(auth, async (user: User | null) => {
    if (profileUnsubscribe) {
      profileUnsubscribe();
      profileUnsubscribe = null;
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
          renderApprovedMainShell(appContainer!, profile, authService);
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

function renderApprovedMainShell(
  container: HTMLElement,
  profile: { display_name: string; role: string; email: string },
  authService: FamilyAuthService
): void {
  container.innerHTML = `
    <div class="h-full w-full flex flex-col justify-between p-6 safe-top safe-bottom bg-surface-canvas text-text-primary">
      <header class="flex justify-between items-center py-2 border-b border-border-subtle">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-brand-on-primary font-bold text-sm">
            ${escapeHtml(profile.display_name.charAt(0).toUpperCase())}
          </div>
          <div>
            <h1 class="text-sm font-bold text-text-primary leading-tight">${escapeHtml(profile.display_name)}</h1>
            <p class="text-[11px] font-semibold text-brand-tertiary uppercase tracking-wider">${escapeHtml(profile.role)}</p>
          </div>
        </div>

        <button 
          id="btn-shell-logout"
          class="px-4 py-1.5 rounded-full bg-surface-base border border-border-subtle text-xs font-semibold hover:bg-surface-elevated transition-all"
        >
          Salir
        </button>
      </header>

      <main class="flex-1 flex flex-col items-center justify-center text-center p-4">
        <div class="w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-4">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 class="text-xl font-extrabold mb-1">Acceso Aprobado</h2>
        <p class="text-xs text-text-secondary max-w-xs mb-4">
          Fase 1 completada con éxito. Listo para la integración de Google Maps en tiempo real y chat grupal (Fase 2).
        </p>
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated border border-border-subtle text-xs font-bold text-brand-tertiary">
          <span class="w-2 h-2 rounded-full bg-status-online"></span>
          Núcleo Familiar Activo
        </span>
      </main>

      <footer class="text-center py-2 text-[11px] text-text-disabled">
        DondeEstan PWA &copy; 2026 &bull; Diseño Kinetic Bloom
      </footer>
    </div>
  `;

  const logoutBtn = container.querySelector('#btn-shell-logout');
  logoutBtn?.addEventListener('click', async () => {
    await authService.logout();
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

init();

