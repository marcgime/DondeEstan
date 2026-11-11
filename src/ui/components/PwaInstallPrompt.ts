import { shouldShowIosInstallPrompt, dismissIosInstallPrompt } from '../../core/pwa';

export function checkAndRenderIosInstallPrompt(container: HTMLElement): void {
  if (!shouldShowIosInstallPrompt()) {
    return;
  }

  // Verificar si ya existe en el DOM
  if (container.querySelector('#ios-install-banner')) {
    return;
  }

  const banner = document.createElement('div');
  banner.id = 'ios-install-banner';
  banner.className =
    'fixed inset-x-3 bottom-20 z-[1300] p-4 rounded-3xl bg-surface-glass backdrop-blur-2xl border border-surface-glass-border shadow-alert text-text-primary safe-bottom animate-in slide-in-from-bottom duration-300 max-w-sm mx-auto';

  banner.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 class="text-xs font-bold text-text-primary">Instala Familia en tu iPhone</h3>
          <p class="text-[11px] text-text-secondary mt-0.5 leading-snug">
            Pulsa <span class="font-bold text-brand-primary">Compartir</span>
            <svg class="w-3.5 h-3.5 inline-block text-brand-primary align-text-bottom" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            y selecciona <span class="font-bold text-text-primary">«Añadir a pantalla de inicio»</span>.
          </p>
        </div>
      </div>
      <button 
        id="btn-close-ios-banner" 
        class="p-1.5 rounded-full text-text-disabled hover:text-text-primary transition-colors shrink-0"
        title="Cerrar sugerencia"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  `;

  banner.querySelector('#btn-close-ios-banner')?.addEventListener('click', () => {
    dismissIosInstallPrompt();
    banner.remove();
  });

  container.appendChild(banner);
}
