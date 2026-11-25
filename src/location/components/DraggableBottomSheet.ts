import type { MemberLocationState } from '../types';
import { triggerHaptic } from '../../ui/utils/haptics';

export interface DraggableBottomSheetOptions {
  member: MemberLocationState;
  onCenter: (coords: { lat: number; lng: number }) => void;
  onClose: () => void;
}

export function renderDraggableBottomSheet(
  container: HTMLElement,
  options: DraggableBottomSheetOptions
): () => void {
  const { member, onCenter, onClose } = options;

  container.innerHTML = `
    <!-- Overlay backdrop -->
    <div id="sheet-backdrop" class="fixed inset-0 z-[1200] bg-surface-overlay transition-opacity duration-300"></div>

    <!-- Draggable Sheet Container -->
    <div 
      id="draggable-sheet"
      class="fixed inset-x-0 bottom-0 z-[1250] floating-sheet-surface rounded-t-[24px] text-text-primary safe-sheet-bottom transition-transform duration-200 select-none touch-none max-w-lg mx-auto will-change-transform"
      style="transform: translateY(0);"
    >
      <!-- Drag Handle -->
      <div id="drag-handle-area" class="w-full py-3 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing">
        <div class="ios-sheet-handle"></div>
      </div>

      <div class="px-5 pb-6 flex flex-col gap-5">
        
        <!-- Header Member Row -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3.5">
            <div class="relative">
              <div class="w-12 h-12 rounded-full bg-surface-inset flex items-center justify-center text-text-primary font-semibold text-lg overflow-hidden border border-border-strong">
                ${
                  member.photo_url
                    ? `<img src="${escapeHtml(member.photo_url)}" alt="${escapeHtml(
                        member.display_name
                      )}" class="w-full h-full object-cover" />`
                    : escapeHtml(member.display_name.charAt(0).toUpperCase())
                }
              </div>
              <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface-elevated ${
                member.isLive ? 'bg-status-online' : 'bg-status-offline'
              }"></span>
            </div>

            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-[20px] font-semibold tracking-[-0.01em] text-text-primary leading-tight">
                  ${escapeHtml(member.display_name)}
                </h2>
                <span class="text-[12px] uppercase font-medium tracking-[0.01em] px-2 py-0.5 rounded-full bg-surface-canvas text-text-secondary">
                  ${escapeHtml(member.role)}
                </span>
              </div>
              <p class="text-[13px] font-medium mt-0.5 tabular-nums ${
                member.isLive ? 'text-status-online' : 'text-text-secondary'
              }">
                ${member.isLive ? 'En directo' : 'Desconectado'} &bull; ${escapeHtml(member.relativeTimeText)}
              </p>
            </div>
          </div>

          <button 
            id="btn-close-sheet"
            class="w-8 h-8 rounded-full bg-surface-canvas text-text-secondary hover:text-text-primary flex items-center justify-center"
            aria-label="Cerrar detalle"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Telemetry Grouped Card -->
        <div class="ios-grouped-list">
          <div class="ios-grouped-row">
            <span class="text-[15px] text-text-secondary">Ubicación GPS</span>
            <span class="font-mono text-[13px] text-text-primary tabular-nums">
              ${
                member.location
                  ? `${member.location.lat.toFixed(4)}, ${member.location.lng.toFixed(4)}`
                  : 'Sin coordenadas'
              }
            </span>
          </div>
          <div class="ios-grouped-row">
            <span class="text-[15px] text-text-secondary">Estado Dispositivo</span>
            <span class="text-[15px] font-medium text-text-primary">GPS Activo</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 pt-1">
          ${
            member.location
              ? `
            <button 
              id="btn-center-member"
              class="flex-1 h-12 flex items-center justify-center gap-2 rounded-[12px] bg-brand-primary text-brand-on-primary font-semibold text-[17px]"
            >
              Centrar en Mapa
            </button>

            <a 
              href="https://www.google.com/maps/dir/?api=1&destination=${member.location.lat},${member.location.lng}" 
              target="_blank" 
              rel="noopener noreferrer"
              id="btn-route-member"
              class="h-12 px-4 flex items-center justify-center gap-1.5 rounded-[12px] bg-surface-canvas border border-border-strong text-brand-primary font-semibold text-[15px]"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Ruta
            </a>
          `
              : ''
          }
        </div>

      </div>
    </div>
  `;

  const sheetEl = container.querySelector('#draggable-sheet') as HTMLElement;
  const backdropEl = container.querySelector('#sheet-backdrop') as HTMLElement;
  const handleArea = container.querySelector('#drag-handle-area') as HTMLElement;

  let startY = 0;
  let currentTranslateY = 0;
  let isDragging = false;

  function onTouchStart(e: TouchEvent): void {
    startY = e.touches[0].clientY;
    isDragging = true;
    sheetEl.style.transition = 'none';
  }

  function onTouchMove(e: TouchEvent): void {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;

    // Solo permitir arrastrar hacia abajo (valores positivos)
    if (deltaY > 0) {
      currentTranslateY = deltaY;
      sheetEl.style.transform = `translateY(${deltaY}px)`;
    }
  }

  function onTouchEnd(): void {
    if (!isDragging) return;
    isDragging = false;
    sheetEl.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.0, 0, 1.0)';

    // Si se arrastró más de 100px hacia abajo, cerrar
    if (currentTranslateY > 100) {
      triggerHaptic('light');
      closeSheet();
    } else {
      // Rebotar a la posición inicial
      sheetEl.style.transform = 'translateY(0)';
      currentTranslateY = 0;
    }
  }

  function closeSheet(): void {
    sheetEl.style.transform = 'translateY(100%)';
    backdropEl.style.opacity = '0';
    setTimeout(() => {
      onClose();
    }, 200);
  }

  handleArea.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchend', onTouchEnd);

  container.querySelector('#btn-close-sheet')?.addEventListener('click', () => {
    triggerHaptic('light');
    closeSheet();
  });

  backdropEl.addEventListener('click', () => {
    triggerHaptic('light');
    closeSheet();
  });

  container.querySelector('#btn-center-member')?.addEventListener('click', () => {
    if (member.location) {
      triggerHaptic('medium');
      onCenter(member.location);
    }
  });

  container.querySelector('#btn-route-member')?.addEventListener('click', () => {
    triggerHaptic('light');
  });

  return () => {
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
  };
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

