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
    <div id="sheet-backdrop" class="fixed inset-0 z-[1200] bg-black/20 backdrop-blur-xs transition-opacity duration-300"></div>

    <!-- Draggable Sheet Container -->
    <div 
      id="draggable-sheet"
      class="fixed inset-x-0 bottom-0 z-[1250] glass-dock rounded-t-3xl shadow-dock text-text-primary pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] transition-transform duration-200 select-none touch-none max-w-lg mx-auto will-change-transform"
      style="transform: translateY(0);"
    >
      <!-- Drag Handle -->
      <div id="drag-handle-area" class="w-full py-3 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing">
        <div class="w-12 h-1.5 rounded-full bg-border-subtle hover:bg-border-strong transition-colors"></div>
      </div>

      <div class="px-5 pb-6 flex flex-col gap-4">
        
        <!-- Header Member Row -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3.5">
            <div class="relative">
              <div class="w-13 h-13 rounded-full bg-brand-primary flex items-center justify-center text-brand-on-primary font-bold text-lg shadow-sm overflow-hidden">
                ${
                  member.photo_url
                    ? `<img src="${escapeHtml(member.photo_url)}" alt="${escapeHtml(
                        member.display_name
                      )}" class="w-full h-full object-cover" />`
                    : escapeHtml(member.display_name.charAt(0).toUpperCase())
                }
              </div>
              <span class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-surface-canvas ${
                member.isLive ? 'bg-status-online animate-pulse' : 'bg-status-offline'
              }"></span>
            </div>

            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-extrabold text-text-primary leading-tight font-sans">
                  ${escapeHtml(member.display_name)}
                </h2>
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary">
                  ${escapeHtml(member.role)}
                </span>
              </div>
              <p class="text-xs font-semibold mt-0.5 ${
                member.isLive ? 'text-status-online' : 'text-text-disabled'
              }">
                ${member.isLive ? 'En directo' : 'Desconectado'} &bull; ${escapeHtml(member.relativeTimeText)}
              </p>
            </div>
          </div>

          <button 
            id="btn-close-sheet"
            class="p-2 rounded-full bg-surface-base border border-border-subtle text-text-secondary hover:text-text-primary transition-all active:scale-95"
            aria-label="Cerrar detalle"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Telemetry Cards Row: Coords & Precision -->
        <div class="grid grid-cols-2 gap-2.5 text-xs">
          <div class="p-3 rounded-2xl bg-surface-base/80 border border-border-subtle flex flex-col gap-1">
            <span class="text-[11px] font-bold text-text-secondary">Ubicación GPS</span>
            <span class="font-mono text-text-primary text-[11px] truncate">
              ${
                member.location
                  ? `${member.location.lat.toFixed(4)}, ${member.location.lng.toFixed(4)}`
                  : 'Sin coordenadas'
              }
            </span>
          </div>

          <div class="p-3 rounded-2xl bg-surface-base/80 border border-border-subtle flex flex-col gap-1">
            <span class="text-[11px] font-bold text-text-secondary">Estado Dispositivo</span>
            <div class="flex items-center gap-1.5 text-text-primary font-medium">
              <svg class="w-3.5 h-3.5 text-status-online" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>GPS Activo</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 pt-1">
          ${
            member.location
              ? `
            <button 
              id="btn-center-member"
              class="flex-1 h-11 flex items-center justify-center gap-2 rounded-full bg-brand-primary text-brand-on-primary font-bold text-xs tracking-wide shadow-card hover:opacity-95 active:scale-98 transition-all"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Centrar en Mapa
            </button>

            <a 
              href="https://www.google.com/maps/dir/?api=1&destination=${member.location.lat},${member.location.lng}" 
              target="_blank" 
              rel="noopener noreferrer"
              id="btn-route-member"
              class="h-11 px-4 flex items-center justify-center gap-1.5 rounded-full bg-surface-elevated border border-border-subtle text-text-primary font-bold text-xs hover:bg-surface-base active:scale-98 transition-all"
            >
              <svg class="w-4 h-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              ¿Cómo llegar?
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

