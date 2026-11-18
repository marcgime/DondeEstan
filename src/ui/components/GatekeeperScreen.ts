import type { UserProfile } from '@/auth/types';

export interface GatekeeperScreenOptions {
  user: UserProfile;
  onLogout: () => Promise<void>;
  onCheckVerification?: () => Promise<boolean>;
  onResendVerification?: () => Promise<void>;
  adminContactEmail?: string;
}

export function renderGatekeeperScreen(
  container: HTMLElement,
  options: GatekeeperScreenOptions
): void {
  const {
    user,
    onLogout,
    onCheckVerification,
    onResendVerification,
    adminContactEmail = 'admin@familia.local',
  } = options;

  const isEmailUnverified = user.status === 'unverified_email';
  let isChecking = false;
  let isResending = false;
  let noticeMessage = '';

  function render(): void {
    container.innerHTML = `
      <div class="h-full w-full flex flex-col justify-between items-center p-6 safe-top safe-bottom bg-surface-canvas text-text-primary">
        <div class="w-full max-w-sm flex flex-col items-center pt-8 text-center">
          
          <!-- Icon Badge -->
          <div class="w-24 h-24 mb-6 rounded-pebble bg-surface-elevated flex items-center justify-center shadow-card border border-border-subtle">
            ${
              isEmailUnverified
                ? `
              <svg class="w-12 h-12 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            `
                : `
              <svg class="w-12 h-12 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            `
            }
          </div>

          <h1 class="text-2xl font-extrabold tracking-tight mb-2 text-text-primary font-sans">
            ${isEmailUnverified ? 'Verifica tu Correo' : 'Acceso en Espera'}
          </h1>
          
          <p class="text-sm font-medium text-text-secondary mb-6 leading-relaxed">
            Hola, <span class="font-bold text-text-primary">${escapeHtml(user.display_name || user.email)}</span>.
            ${
              isEmailUnverified
                ? 'Hemos enviado un enlace de confirmación a tu correo electrónico para verificar tu identidad.'
                : 'Tu correo ha sido verificado con éxito y tu solicitud está lista.'
            }
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
                  ${isEmailUnverified ? 'Paso 1 de 2: Confirmar Email' : 'Paso 2 de 2: Autorización'}
                </h2>
                <p class="text-xs text-text-primary leading-normal">
                  ${
                    isEmailUnverified
                      ? `Abre tu buzón en <span class="font-bold">${escapeHtml(
                          user.email
                        )}</span> y haz clic en el enlace. Una vez confirmado, tu solicitud llegará al administrador.`
                      : 'Por privacidad y seguridad del núcleo familiar, el administrador debe autorizar tu acceso para desbloquear el mapa en directo.'
                  }
                </p>
              </div>
            </div>
          </div>

          ${
            noticeMessage
              ? `
            <div class="w-full p-3 mb-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-medium text-center">
              ${escapeHtml(noticeMessage)}
            </div>
          `
              : ''
          }

          <!-- Real-time pulse indicator -->
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-elevated border border-border-subtle text-xs font-semibold text-text-secondary mb-4">
            <span class="w-2.5 h-2.5 rounded-full ${isEmailUnverified ? 'bg-status-info animate-pulse' : 'bg-status-warning animate-pulse'}"></span>
            <span>${isEmailUnverified ? 'Esperando confirmación de enlace...' : 'Esperando aprobación del administrador...'}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="w-full max-w-sm flex flex-col gap-3 pb-4">
          ${
            isEmailUnverified
              ? `
            <button 
              id="btn-check-verified"
              ${isChecking ? 'disabled' : ''}
              class="w-full h-12 flex items-center justify-center gap-2 rounded-full bg-brand-primary text-brand-on-primary font-bold text-sm tracking-wide shadow-card hover:opacity-95 active:scale-98 transition-all disabled:opacity-60"
            >
              ${isChecking ? 'Comprobando...' : 'Ya he verificado mi correo'}
            </button>

            <button 
              id="btn-resend-verified"
              ${isResending ? 'disabled' : ''}
              class="w-full py-2.5 text-xs font-bold text-brand-primary hover:underline text-center"
            >
              ${isResending ? 'Reenviando...' : 'Reenviar correo de verificación'}
            </button>
          `
              : `
            <a 
              href="mailto:${encodeURIComponent(adminContactEmail)}?subject=Aprobacion%20de%20Acceso%20Familia&body=Hola,%20he%20verificado%20mi%20correo%20${encodeURIComponent(user.email)}.%20Por%20favor%20activa%20mi%20acceso%20a%20la%20familia."
              class="w-full h-12 flex items-center justify-center gap-2 rounded-full bg-brand-primary text-brand-on-primary font-bold text-sm tracking-wide shadow-card hover:opacity-95 active:scale-98 transition-all"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Avisar al Administrador
            </a>
          `
          }

          <button 
            id="btn-gatekeeper-logout"
            class="w-full h-12 flex items-center justify-center rounded-full bg-surface-base border border-border-subtle text-text-primary font-semibold text-sm hover:bg-surface-elevated active:scale-98 transition-all"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents(): void {
    const logoutBtn = container.querySelector('#btn-gatekeeper-logout');
    logoutBtn?.addEventListener('click', async () => {
      logoutBtn.setAttribute('disabled', 'true');
      logoutBtn.textContent = 'Cerrando sesión...';
      try {
        await onLogout();
      } catch (err) {
        console.error('Error logging out:', err);
      }
    });

    const checkBtn = container.querySelector('#btn-check-verified');
    checkBtn?.addEventListener('click', async () => {
      if (!onCheckVerification) return;
      isChecking = true;
      noticeMessage = '';
      render();

      try {
        const verified = await onCheckVerification();
        isChecking = false;
        if (!verified) {
          noticeMessage = 'Aún no detectamos la verificación. Asegúrate de hacer clic en el enlace del correo y pulsa de nuevo.';
          render();
        }
      } catch (err) {
        isChecking = false;
        noticeMessage = err instanceof Error ? err.message : 'Error comprobando verificación.';
        render();
      }
    });

    const resendBtn = container.querySelector('#btn-resend-verified');
    resendBtn?.addEventListener('click', async () => {
      if (!onResendVerification) return;
      isResending = true;
      render();

      try {
        await onResendVerification();
        isResending = false;
        noticeMessage = 'Nuevo correo de verificación enviado. Revisa tu bandeja de entrada o spam.';
        render();
      } catch (err) {
        isResending = false;
        noticeMessage = err instanceof Error ? err.message : 'Error al reenviar.';
        render();
      }
    });
  }

  render();
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
