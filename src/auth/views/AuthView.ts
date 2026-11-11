import type { FamilyAuthService } from '../auth_service';

export interface AuthViewOptions {
  authService: FamilyAuthService;
  onAuthenticated: () => void;
}

export function renderAuthView(
  container: HTMLElement,
  options: AuthViewOptions
): void {
  const { authService, onAuthenticated } = options;
  let isRegisterMode = false;
  let isLoading = false;
  let errorMessage = '';

  function render(): void {
    container.innerHTML = `
      <div class="h-full w-full flex flex-col justify-center items-center p-6 safe-top safe-bottom bg-surface-canvas text-text-primary overflow-y-auto">
        <div class="w-full max-w-sm flex flex-col items-center my-auto">
          
          <!-- App Header & Logo -->
          <div class="w-20 h-20 mb-5 rounded-pebble bg-brand-primary flex items-center justify-center shadow-card text-brand-on-primary">
            <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <h1 class="text-2xl font-extrabold tracking-tight text-text-primary mb-1 font-sans">
            ¿Dónde Están?
          </h1>
          <p class="text-xs font-semibold text-text-secondary tracking-wide uppercase mb-6">
            Localizador Familiar Privado
          </p>

          <!-- Toggle Pills -->
          <div class="w-full flex p-1 mb-6 rounded-full bg-surface-base border border-border-subtle">
            <button 
              id="tab-login"
              class="flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                !isRegisterMode
                  ? 'bg-brand-primary text-brand-on-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }"
            >
              Iniciar Sesión
            </button>
            <button 
              id="tab-register"
              class="flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                isRegisterMode
                  ? 'bg-brand-primary text-brand-on-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }"
            >
              Solicitar Registro
            </button>
          </div>

          <!-- Error Alert -->
          ${
            errorMessage
              ? `
            <div class="w-full p-3 mb-4 rounded-2xl bg-status-error/10 border border-status-error/30 text-status-error text-xs font-medium flex items-start gap-2">
              <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>${escapeHtml(errorMessage)}</span>
            </div>
          `
              : ''
          }

          <!-- Form -->
          <form id="auth-form" class="w-full flex flex-col gap-3.5">
            ${
              isRegisterMode
                ? `
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-text-secondary pl-1">Nombre Completo</label>
                <input 
                  type="text" 
                  id="input-name"
                  placeholder="Ej. Marc Giménez" 
                  required
                  class="w-full h-12 px-4 rounded-full bg-surface-base border border-border-subtle text-text-primary placeholder:text-text-disabled text-sm focus:outline-none focus:border-brand-primary transition-all"
                />
              </div>
            `
                : ''
            }

            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-text-secondary pl-1">Correo Electrónico</label>
              <input 
                type="email" 
                id="input-email"
                placeholder="familiar@correo.com" 
                required
                class="w-full h-12 px-4 rounded-full bg-surface-base border border-border-subtle text-text-primary placeholder:text-text-disabled text-sm focus:outline-none focus:border-brand-primary transition-all"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-text-secondary pl-1">Contraseña</label>
              <input 
                type="password" 
                id="input-password"
                placeholder="${isRegisterMode ? 'Mínimo 8 caracteres' : '••••••••'}" 
                minlength="${isRegisterMode ? 8 : 1}"
                required
                class="w-full h-12 px-4 rounded-full bg-surface-base border border-border-subtle text-text-primary placeholder:text-text-disabled text-sm focus:outline-none focus:border-brand-primary transition-all"
              />
            </div>

            <button 
              type="submit" 
              id="btn-submit"
              ${isLoading ? 'disabled' : ''}
              class="w-full h-12 mt-2 flex items-center justify-center gap-2 rounded-full bg-brand-primary text-brand-on-primary font-bold text-sm tracking-wide shadow-card hover:opacity-95 active:scale-98 transition-all disabled:opacity-60"
            >
              ${
                isLoading
                  ? `
                <svg class="animate-spin h-4 w-4 text-brand-on-primary" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Procesando...</span>
              `
                  : isRegisterMode
                  ? 'Solicitar Acceso'
                  : 'Entrar'
              }
            </button>
          </form>

          ${
            isRegisterMode
              ? `
            <p class="text-[11px] text-text-disabled text-center mt-4 leading-normal px-2">
              * El alta requiere que tu email esté preautorizado en la lista blanca del núcleo familiar.
            </p>
          `
              : ''
          }

        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents(): void {
    const tabLogin = container.querySelector('#tab-login');
    const tabRegister = container.querySelector('#tab-register');
    const form = container.querySelector('#auth-form') as HTMLFormElement | null;

    tabLogin?.addEventListener('click', () => {
      if (isRegisterMode) {
        isRegisterMode = false;
        errorMessage = '';
        render();
      }
    });

    tabRegister?.addEventListener('click', () => {
      if (!isRegisterMode) {
        isRegisterMode = true;
        errorMessage = '';
        render();
      }
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = container.querySelector('#input-email') as HTMLInputElement | null;
      const passInput = container.querySelector('#input-password') as HTMLInputElement | null;
      const nameInput = container.querySelector('#input-name') as HTMLInputElement | null;

      const email = emailInput?.value || '';
      const password = passInput?.value || '';
      const name = nameInput?.value || '';

      isLoading = true;
      errorMessage = '';
      render();

      try {
        if (isRegisterMode) {
          await authService.register(email, password, name);
        } else {
          await authService.login(email, password);
        }
        onAuthenticated();
      } catch (err) {
        isLoading = false;
        errorMessage = err instanceof Error ? err.message : 'Error al procesar la solicitud.';
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

