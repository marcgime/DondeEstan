import type { ProfileService } from '../profile_service';
import { compressAndCropAvatar } from '../image_compressor';
import type { UserProfile } from '../../auth/types';
import type { Group, GroupService } from '../../admin';
import { renderFloatingTabBar } from '../../ui/components/FloatingTabBar';
import { triggerHaptic } from '../../ui/utils/haptics';
import {
  UI_SCALE_OPTIONS,
  applyUiScale,
  getStoredUiScale,
  isValidUiScale,
  type UiScaleLevel,
} from '../../ui/theme/ui_scale';

export interface ProfileViewOptions {
  profile: UserProfile;
  profileService: ProfileService;
  groupService?: GroupService;
  onNavigateTab: (tab: 'map' | 'chat' | 'profile') => void;
  onOpenAdminPanel?: () => void;
  onLogout: () => Promise<void>;
}

export function renderProfileView(
  container: HTMLElement,
  options: ProfileViewOptions
): () => void {
  const { profile, profileService, groupService, onNavigateTab, onOpenAdminPanel, onLogout } = options;
  const initial = (profile.display_name || 'F')[0].toUpperCase();
  let isEditingName = false;
  let isUploadingPhoto = false;
  let currentScale: UiScaleLevel = isValidUiScale(profile.ui_scale)
    ? profile.ui_scale
    : getStoredUiScale();
  let cleanupTabBar: (() => void) | null = null;
  let groupsUnsubscribe: (() => void) | null = null;
  let userGroups: Group[] = [];
  let groupsLoaded = !groupService;

  function renderUserGroupsContent(): string {
    if (!groupsLoaded) {
      return '<span class="text-text-secondary font-bold">Cargando...</span>';
    }
    if (userGroups.length === 0) {
      return '<span class="text-text-disabled font-bold">Sin grupos asignados</span>';
    }
    return userGroups
      .map(
        (g) =>
          `<span class="px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-bold">${escapeHtml(
            g.name
          )}</span>`
      )
      .join('');
  }

  function render(): void {
    if (cleanupTabBar) {
      cleanupTabBar();
      cleanupTabBar = null;
    }
    container.innerHTML = `
      <div class="relative h-full w-full flex flex-col bg-surface-canvas text-text-primary overflow-hidden">
        
        <!-- iOS Nav Bar (Compact 44pt row: Page Title on Left, Primary Action on Right) -->
        <header class="ios-nav-bar safe-header-top">
          <h1 class="text-base font-extrabold tracking-tight text-text-primary">Mi Perfil</h1>
          <button 
            id="profile-btn-logout"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-elevated border border-border-subtle text-status-error text-xs font-bold hover:bg-status-error/10 transition-colors"
            title="Cerrar sesión"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Salir</span>
          </button>
        </header>

        <!-- Profile Content -->
        <div id="profile-scroll-container" class="flex-1 overflow-y-auto px-5 py-4 flex flex-col items-center gap-3.5 pb-36">
          
          <!-- Avatar Big with Upload Badge -->
          <div class="relative mt-1">
            <div class="w-20 h-20 rounded-full border-4 border-brand-primary/20 bg-surface-card overflow-hidden flex items-center justify-center text-2xl font-extrabold text-brand-primary shadow-card">
              ${
                isUploadingPhoto
                  ? `
                <div class="animate-spin text-brand-primary">
                  <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              `
                  : profile.photo_url
                  ? `<img src="${profile.photo_url}" alt="${escapeHtml(profile.display_name)}" class="w-full h-full object-cover" />`
                  : initial
              }
            </div>

            <!-- Change photo button -->
            <label 
              for="input-avatar-file"
              class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-primary text-brand-on-primary flex items-center justify-center cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-transform"
              title="Cambiar foto de perfil"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </label>
            <input type="file" id="input-avatar-file" accept="image/*" class="hidden" />
          </div>

          <!-- User Name and Edit Option -->
          <div class="text-center w-full max-w-xs">
            ${
              isEditingName
                ? `
              <form id="form-edit-name" class="flex items-center gap-2 mt-1">
                <input 
                  type="text" 
                  id="input-display-name" 
                  value="${escapeHtml(profile.display_name)}" 
                  class="flex-1 h-9 px-3 rounded-full bg-surface-base border border-brand-primary text-xs font-bold text-text-primary focus:outline-none"
                  required
                />
                <button type="submit" class="px-3 py-1.5 rounded-full bg-brand-primary text-brand-on-primary text-xs font-bold shadow-xs">
                  Guardar
                </button>
                <button type="button" id="btn-cancel-edit-name" class="px-2 py-1.5 rounded-full text-xs text-text-secondary">
                  Cancelar
                </button>
              </form>
            `
                : `
              <div class="flex items-center justify-center gap-2">
                <h2 class="text-lg font-extrabold text-text-primary">${escapeHtml(profile.display_name)}</h2>
                <button id="btn-start-edit-name" class="text-text-secondary hover:text-brand-primary transition-colors p-1" title="Editar nombre">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            `
            }
            <p class="text-xs text-text-secondary mt-0.5">${escapeHtml(profile.email)}</p>
            <span class="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
              profile.role === 'admin'
                ? 'bg-brand-primary text-brand-on-primary'
                : 'bg-surface-elevated text-text-secondary'
            }">
              ${profile.role === 'admin' ? 'Administrador' : 'Miembro'}
            </span>
          </div>

          <!-- Admin Panel Button (Exclusive to Admin) -->
          ${
            profile.role === 'admin' && onOpenAdminPanel
              ? `
            <div class="w-full max-w-sm mt-1">
              <button 
                id="btn-open-admin"
                class="w-full p-4 rounded-2xl glass-panel text-brand-primary font-bold text-xs flex items-center justify-between shadow-dock hover:bg-brand-primary/5 active:scale-98 transition-all"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div class="text-left">
                    <p class="text-text-primary text-xs font-bold">Panel de Administración</p>
                    <p class="text-[0.75rem] text-text-secondary font-normal">Gestionar usuarios y grupos</p>
                  </div>
                </div>
                <svg class="w-4 h-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          `
              : ''
          }

          <!-- Selector de Zoom / Tamaño de Interfaz -->
          <div class="w-full max-w-sm p-4 rounded-2xl glass-panel shadow-xs flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-text-primary">Tamaño de Letra y Zoom</p>
                <p class="text-[0.75rem] text-text-secondary">Ajusta la escala visual de toda la aplicación</p>
              </div>
              <span class="px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold">
                ${UI_SCALE_OPTIONS.find((o) => o.id === currentScale)?.percentage || '108%'}
              </span>
            </div>

            <div class="grid grid-cols-4 gap-1.5">
              ${UI_SCALE_OPTIONS.map((opt) => {
                const isActive = opt.id === currentScale;
                return `
                  <button
                    type="button"
                    data-ui-scale="${opt.id}"
                    class="btn-ui-scale py-2 px-1.5 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 border ${
                      isActive
                        ? 'bg-brand-primary text-brand-on-primary border-brand-primary shadow-xs font-bold'
                        : 'bg-surface-base text-text-secondary border-border-subtle hover:text-text-primary font-semibold'
                    }"
                  >
                    <span class="text-xs">${opt.label}</span>
                    <span class="text-[0.6875rem] opacity-80">${opt.percentage}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Info Cards -->
          <div class="w-full max-w-sm flex flex-col gap-2.5 mt-1">
            <div class="p-3.5 rounded-2xl glass-panel shadow-xs flex items-center justify-between text-xs">
              <span class="font-bold text-text-secondary">Estado de cuenta</span>
              <span class="text-status-online font-bold uppercase tracking-wider">Activa y Aprobada</span>
            </div>

            <div class="p-3.5 rounded-2xl glass-panel shadow-xs flex items-center justify-between text-xs">
              <span class="font-bold text-text-secondary">Privacidad</span>
              <span class="text-brand-primary font-bold">Cero Telemetría</span>
            </div>

            <div class="p-3.5 rounded-2xl glass-panel shadow-xs flex items-center justify-between gap-3 text-xs">
              <span class="font-bold text-text-secondary shrink-0">Núcleo</span>
              <div id="profile-user-groups" class="flex flex-wrap items-center justify-end gap-1.5 text-right">
                ${renderUserGroupsContent()}
              </div>
            </div>
          </div>

        </div>

        <!-- DS-NAV-DOCK: Bottom Floating Navigation Slot -->
        <div id="profile-dock-slot"></div>

      </div>
    `;

    bindEvents();
  }

  function bindEvents(): void {
    const dockSlot = container.querySelector('#profile-dock-slot') as HTMLElement | null;
    if (dockSlot) {
      cleanupTabBar = renderFloatingTabBar(dockSlot, {
        activeTab: 'profile',
        zIndexClass: 'z-[1100]',
        onNavigateTab,
        onActiveTabClick: () => {
          const scrollEl = container.querySelector('#profile-scroll-container') as HTMLElement | null;
          scrollEl?.scrollTo({ top: 0, behavior: 'smooth' });
        },
      });
    }

    container.querySelector('#profile-btn-logout')?.addEventListener('click', async () => {
      triggerHaptic('light');
      await onLogout();
    });

    container.querySelector('#btn-open-admin')?.addEventListener('click', () => {
      triggerHaptic('medium');
      if (onOpenAdminPanel) {
        onOpenAdminPanel();
      }
    });

    // Selector de escala visual (Zoom de interfaz)
    container.querySelectorAll('.btn-ui-scale').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const rawScale = (btn as HTMLElement).dataset.uiScale;
        if (!isValidUiScale(rawScale) || rawScale === currentScale) return;

        triggerHaptic('light');
        currentScale = applyUiScale(rawScale);
        profile.ui_scale = currentScale;
        render();

        try {
          await profileService.updateUiScale(profile.uid, currentScale);
        } catch (err) {
          console.warn('No se pudo sincronizar la escala visual en la nube:', err);
        }
      });
    });

    // Subida y compresión de imagen
    const fileInput = container.querySelector('#input-avatar-file') as HTMLInputElement | null;
    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      isUploadingPhoto = true;
      render();

      try {
        const compressedBase64 = await compressAndCropAvatar(file);
        await profileService.updateAvatar(profile.uid, compressedBase64);
        profile.photo_url = compressedBase64;
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al comprimir o subir la imagen.');
      } finally {
        isUploadingPhoto = false;
        render();
      }
    });

    // Edición de nombre
    container.querySelector('#btn-start-edit-name')?.addEventListener('click', () => {
      isEditingName = true;
      render();
    });

    container.querySelector('#btn-cancel-edit-name')?.addEventListener('click', () => {
      isEditingName = false;
      render();
    });

    const formEditName = container.querySelector('#form-edit-name') as HTMLFormElement | null;
    formEditName?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = container.querySelector('#input-display-name') as HTMLInputElement | null;
      const newName = input?.value.trim() || '';
      if (!newName) return;

      try {
        await profileService.updateDisplayName(profile.uid, newName);
        profile.display_name = newName;
        isEditingName = false;
        render();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al actualizar el nombre.');
      }
    });
  }

  render();

  if (groupService) {
    groupsUnsubscribe = groupService.subscribeToGroups((allGroups) => {
      userGroups = groupService.getUserGroups(profile, allGroups);
      groupsLoaded = true;
      const groupsEl = container.querySelector('#profile-user-groups');
      if (groupsEl) {
        groupsEl.innerHTML = renderUserGroupsContent();
      }
    });
  }

  return () => {
    if (groupsUnsubscribe) {
      groupsUnsubscribe();
      groupsUnsubscribe = null;
    }
    if (cleanupTabBar) {
      cleanupTabBar();
      cleanupTabBar = null;
    }
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

