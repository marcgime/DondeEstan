import type { UserProfile } from '@/auth/types';
import { isUserWaitingGroup } from '@/auth/gatekeeper';

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
  const isWaitingGroup = isUserWaitingGroup(user);
  let isChecking = false;
  let isResending = false;
  let noticeMessage = '';

  function render(): void {
    let screenTitle = 'Acceso en Espera';
    let screenSubtitle = '';
    let stepTitle = 'Paso 2 de 2: Autorización';
    let stepDescription = '';
    let pulseText = 'Esperando aprobación del administrador...';

    if (isEmailUnverified) {
      screenTitle = 'Verifica tu Correo';
      screenSubtitle = 'Hemos enviado un enlace de confirmación a tu correo electrónico para verificar tu identidad.';
      stepTitle = 'Paso 1 de 2: Confirmar Email';
      stepDescription = `Abre tu buzón en <span class="font-bold">${escapeHtml(user.email)}</span> y haz clic en el enlace. Una vez confirmado, tu solicitud llegará al administrador.`;
      pulseText = 'Esperando confirmación de enlace...';
    } else if (isWaitingGroup) {
      screenTitle = 'Esperando asignación a un grupo';
      screenSubtitle = 'Tu cuenta está activa, pero aún no has sido asignado a ningún grupo. El administrador te asignará pronto.';
      stepTitle = 'Asignación de Grupo Pendiente';
      stepDescription = 'Para acceder al mapa y al chat de la familia, el administrador debe incluirte en uno o más grupos familiares.';
      pulseText = 'Esperando asignación de grupo...';
    } else {
      screenTitle = 'Acceso en Espera';
      screenSubtitle = 'Tu correo ha sido verificado con éxito y tu solicitud está lista.';
      stepTitle = 'Paso 2 de 2: Autorización';
      stepDescription = 'Por privacidad y seguridad del núcleo familiar, el administrador debe autorizar tu acceso para desbloquear el mapa en directo.';
      pulseText = 'Esperando aprobación del administrador...';
    }

    container.innerHTML = `
      <div class="h-full w-full flex flex-col justify-between items-center px-6 pb-6 safe-header-top safe-bottom bg-surface-canvas text-text-primary overflow-y-auto">
        <div class="w-full max-w-sm flex flex-col items-center pt-4 text-center">
          
          <!-- Icon Badge -->
          <div class="w-20 h-20 mb-6 rounded-[20px] bg-surface-elevated flex items-center justify-center border border-border-strong">
            ${
              isEmailUnverified
                ? `
              <svg class="w-10 h-10 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            `
                : isWaitingGroup
                ? `
              <svg class="w-10 h-10 text-status-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            `
                : `
              <svg class="w-10 h-10 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            `
            }
          </div>

          <h1 class="text-[28px] font-bold tracking-[-0.02em] mb-2 text-text-primary leading-[1.2]">
            ${screenTitle}
          </h1>
          
          <p class="text-[17px] text-text-secondary mb-6 leading-[1.45]">
            Hola, <span class="font-semibold text-text-primary">${escapeHtml(user.display_name || user.email)}</span>.
            <br />
            ${screenSubtitle}
          </p>

          <!-- Information Card -->
          <div class="w-full ios-card p-4 mb-6 text-left">
            <div class="flex items-start gap-3">
              <div class="p-2 rounded-full bg-brand-primary/10 text-brand-primary shrink-0 mt-0.5">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 class="text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  ${stepTitle}
                </h2>
                <p class="text-xs text-text-primary leading-normal">
                  ${stepDescription}
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
            <span>${pulseText}</span>
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
              class="w-full h-12 flex items-center justify-center gap-2 rounded-[12px] bg-brand-primary text-brand-on-primary font-semibold text-[17px] disabled:opacity-60"
            >
              ${isChecking ? 'Comprobando...' : 'Ya he verificado mi correo'}
            </button>

            <button 
              id="btn-resend-verified"
              ${isResending ? 'disabled' : ''}
              class="w-full py-2.5 text-[15px] font-medium text-brand-primary hover:underline text-center"
            >
              ${isResending ? 'Reenviando...' : 'Reenviar correo de verificación'}
            </button>
          `
              : isWaitingGroup
              ? `
            <button 
              id="btn-check-verified"
              ${isChecking ? 'disabled' : ''}
              class="w-full h-12 flex items-center justify-center gap-2 rounded-[12px] bg-brand-primary text-brand-on-primary font-semibold text-[17px] disabled:opacity-60"
            >
              ${isChecking ? 'Comprobando...' : 'Comprobar de nuevo'}
            </button>
          `
              : `
            <a 
              href="mailto:${encodeURIComponent(adminContactEmail)}?subject=Aprobacion%20de%20Acceso%20Familia&body=Hola,%20he%20verificado%20mi%20correo%20${encodeURIComponent(user.email)}.%20Por%20favor%20activa%20mi%20acceso%20a%20la%20familia."
              class="w-full h-12 flex items-center justify-center gap-2 rounded-[12px] bg-brand-primary text-brand-on-primary font-semibold text-[17px]"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Avisar al Administrador
            </a>
          `
          }

          <button 
            id="btn-gatekeeper-logout"
            class="w-full h-12 flex items-center justify-center rounded-[12px] bg-surface-elevated border border-border-strong text-text-primary font-medium text-[17px]"
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
      if (!onCheckVerification) {
        // En caso de no tener callback específico, dar feedback visual y recargar
        isChecking = true;
        render();
        setTimeout(() => {
          isChecking = false;
          window.location.reload();
        }, 600);
        return;
      }
      isChecking = true;
      noticeMessage = '';
      render();

      try {
        const verified = await onCheckVerification();
        isChecking = false;
        if (!verified) {
          noticeMessage = isWaitingGroup 
            ? 'Aún no se ha asignado ningún grupo a tu cuenta. Consulta con el administrador.'
            : 'Aún no detectamos la verificación. Asegúrate de hacer clic en el enlace del correo y pulsa de nuevo.';
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
      noticeMessage = '';
      render();

      try {
        await onResendVerification();
        isResending = false;
        noticeMessage = 'Correo de verificación reenviado con éxito. Revisa tu bandeja de entrada o spam.';
        render();
      } catch (err) {
        isResending = false;
        noticeMessage = err instanceof Error ? err.message : 'Error reenviando correo de verificación.';
        render();
      }
    });
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  render();
}
