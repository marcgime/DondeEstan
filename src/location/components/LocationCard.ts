import type { MemberLocationState } from '../types';

export interface LocationCardOptions {
  member: MemberLocationState;
  onCenter: (coords: { lat: number; lng: number }) => void;
  onClose: () => void;
}

export function renderLocationCard(
  container: HTMLElement,
  options: LocationCardOptions
): void {
  const { member, onCenter, onClose } = options;

  container.innerHTML = `
    <div class="fixed inset-x-0 bottom-0 z-40 p-4 safe-bottom animate-in slide-in-from-bottom duration-200">
      <div class="w-full max-w-sm mx-auto bg-surface-glass backdrop-blur-xl border border-surface-glass-border rounded-3xl p-5 shadow-dock text-text-primary">
        
        <!-- Header Row -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="relative">
              <div class="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-brand-on-primary font-bold text-base shadow-sm">
                ${
                  member.photo_url
                    ? `<img src="${escapeHtml(member.photo_url)}" alt="${escapeHtml(
                        member.display_name
                      )}" class="w-full h-full rounded-full object-cover" />`
                    : escapeHtml(member.display_name.charAt(0).toUpperCase())
                }
              </div>
              <!-- Status halo dot -->
              <span class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-surface-canvas ${
                member.isLive ? 'bg-status-online animate-pulse' : 'bg-status-offline'
              }"></span>
            </div>

            <div>
              <h2 class="text-base font-extrabold text-text-primary leading-tight font-sans">
                ${escapeHtml(member.display_name)}
              </h2>
              <p class="text-xs font-semibold ${
                member.isLive ? 'text-brand-tertiary' : 'text-text-disabled'
              }">
                ${member.isLive ? 'En directo' : 'Desconectado'} &bull; ${escapeHtml(member.relativeTimeText)}
              </p>
            </div>
          </div>

          <button 
            id="btn-close-card"
            class="p-2 rounded-full bg-surface-base/80 border border-border-subtle text-text-secondary hover:text-text-primary transition-all"
            aria-label="Cerrar detalle"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Coordinates & Details Pill -->
        ${
          member.location
            ? `
          <div class="flex items-center justify-between p-3 rounded-2xl bg-surface-base/60 border border-border-subtle mb-4 text-xs">
            <div class="flex items-center gap-2 text-text-secondary">
              <svg class="w-4 h-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span class="font-mono">${member.location.lat.toFixed(4)}, ${member.location.lng.toFixed(4)}</span>
            </div>
            <span class="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary">
              ${escapeHtml(member.role)}
            </span>
          </div>
        `
            : `
          <p class="text-xs text-text-disabled mb-4">No hay coordenadas recientes para este familiar.</p>
        `
        }

        <!-- Actions -->
        <div class="flex gap-2">
          ${
            member.location
              ? `
            <button 
              id="btn-center-card"
              class="flex-1 h-11 flex items-center justify-center gap-2 rounded-full bg-brand-primary text-brand-on-primary font-bold text-xs tracking-wide shadow-card hover:opacity-95 active:scale-98 transition-all"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Centrar Mapa
            </button>
          `
              : ''
          }
        </div>

      </div>
    </div>
  `;

  container.querySelector('#btn-close-card')?.addEventListener('click', onClose);

  if (member.location) {
    container.querySelector('#btn-center-card')?.addEventListener('click', () => {
      onCenter(member.location!);
    });
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
