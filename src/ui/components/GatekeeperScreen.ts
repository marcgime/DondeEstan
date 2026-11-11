import type { UserProfile } from '@/auth/types';

export interface GatekeeperScreenOptions {
  user: UserProfile;
  onLogout: () => Promise<void>;
  adminContactEmail?: string;
}

export function renderGatekeeperScreen(
  container: HTMLElement,
  options: GatekeeperScreenOptions
): void {
  const { user, onLogout, adminContactEmail = 'admin@familia.local' } = options;

  container.innerHTML = `
    <div class="h-full w-full flex flex-col justify-between items-center p-6 safe-top safe-bottom bg-surface-canvas text-text-primary">
      <div class="w-full max-w-sm flex flex-col items-center pt-8 text-center">
        <!-- Floating Animated Shield / Lock Badge -->
        <div class="w-24 h-24 mb-6 rounded-pebble bg-surface-elevated flex items-center justify-center shadow-card border border-border-subtle">
          <svg class="w-12 h-12 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h1 class="text-2xl font-extrabold tracking-tight mb-2 text-text-primary font-sans">
          Acceso en Espera
        </h1>
        
        <p class="text-sm font-medium text-text-secondary mb-6 leading-relaxed">
          Hola, <span class="font-bold text-text-primary">${escapeHtml(user.display_name || user.email)}</span>. Tu cuenta ha sido registrada con éxito.
        </p>

        <!-- Information Card -->
        <div class="w-full bg-surface-base border border-border-subtle rounded-2xl p-5 mb-6 text-left shadow-card">
          <div class="flex items-start gap-3">
            <div class="p-2 rounded-full bg-brand-primary/10 text-brand-primary shrink-0 mt-0.5">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 class="text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                Seguridad Familiar
              </h2>
              <p class="text-xs text-text-primary leading-normal">
                Por motivos de privacidad del núcleo familiar, el administrador debe autorizar manualmente tu acceso antes de desbloquear el mapa y el chat en directo.
              </p>
            </div>
          </div>
        </div>

        <!-- Real-time pulse indicator -->
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-elevated border border-border-subtle text-xs font-semibold text-text-secondary mb-4">
          <span class="w-2.5 h-2.5 rounded-full bg-status-warning animate-pulse"></span>
          <span>Esperando aprobación del administrador...</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="w-full max-w-sm flex flex-col gap-3 pb-4">
        <a 
          href="mailto:${encodeURIComponent(adminContactEmail)}?subject=Aprobacion%20de%20Acceso%20Familia&body=Hola,%20he%20registrado%20mi%20cuenta%20con%20el%20correo%20${encodeURIComponent(user.email)}.%20Por%20favor%20activa%20mi%20acceso."
          class="w-full h-12 flex items-center justify-center gap-2 rounded-full bg-brand-primary text-brand-on-primary font-bold text-sm tracking-wide shadow-card hover:opacity-95 active:scale-98 transition-all"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Avisar al Administrador
        </a>

        <button 
          id="btn-gatekeeper-logout"
          class="w-full h-12 flex items-center justify-center rounded-full bg-surface-base border border-border-subtle text-text-primary font-semibold text-sm hover:bg-surface-elevated active:scale-98 transition-all"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  `;

  const logoutBtn = container.querySelector('#btn-gatekeeper-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.setAttribute('disabled', 'true');
      logoutBtn.textContent = 'Cerrando sesión...';
      try {
        await onLogout();
      } catch (err) {
        console.error('Error logging out:', err);
      }
    });
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

