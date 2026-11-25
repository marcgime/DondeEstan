import type { ProfileService } from '../profile_service';
import { compressAndCropAvatar } from '../image_compressor';
import type { UserProfile } from '../../auth/types';
import type { Group, GroupService } from '../../admin';
import {
  isChatNotificationsEnabled,
  setStoredChatNotificationsEnabled,
  requestChatNotificationPermission,
  getNotificationPermissionState,
  syncUserWebPushSubscription,
} from '../../chat';
import { getFirebaseServices, isFirebaseConfigured } from '../../core/firebase';
import { renderFloatingTabBar, type FloatingTabId } from '../../ui/components/FloatingTabBar';
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
  onNavigateTab: (tab: FloatingTabId) => void;
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
  let isZoomMenuOpen = false;
  let chatNotificationsEnabled = isChatNotificationsEnabled(profile);
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
    const prevScrollEl = container.querySelector(
      '#profile-scroll-container'
    ) as HTMLElement | null;
    const prevScrollTop = prevScrollEl ? prevScrollEl.scrollTop : 0;

    if (cleanupTabBar) {
      cleanupTabBar();
      cleanupTabBar = null;
    }
    const activeScaleOpt =
      UI_SCALE_OPTIONS.find((o) => o.id === currentScale) || UI_SCALE_OPTIONS[1];
    container.innerHTML = `
      <div class="relative h-full w-full flex flex-col bg-surface-canvas text-text-primary overflow-hidden overscroll-contain-y">
        
        <!-- iOS Nav Bar (Opaca, sin blur; título centrado aparece al colapsar Large Title) -->
        <header class="ios-nav-bar safe-header-top">
          <div class="w-16 shrink-0"></div>
          <h1 id="profile-compact-title" class="ios-nav-title-compact opacity-0 pointer-events-none">Mi Perfil</h1>
          <button 
            id="profile-btn-logout"
            class="flex items-center justify-end gap-1 px-2.5 py-1 rounded-[12px] text-status-error text-[15px] font-medium"
            title="Cerrar sesión"
          >
            <span>Salir</span>
          </button>
        </header>

        <!-- Profile Content -->
        <div id="profile-scroll-container" class="flex-1 min-h-0 overflow-y-auto overscroll-contain-y px-4 sm:px-5 pt-2 pb-40 flex flex-col gap-6">
          
          <!-- Large Title -->
          <div class="max-w-sm w-full mx-auto">
            <h2 class="ios-large-title">Mi Perfil</h2>
          </div>

          <!-- Avatar + Nombre -->
          <div class="w-full max-w-sm mx-auto flex flex-col items-center gap-3">
            <div class="relative shrink-0">
              <div class="w-20 h-20 rounded-full border border-border-strong bg-surface-elevated overflow-hidden flex items-center justify-center text-2xl font-semibold text-text-primary">
                ${
                  isUploadingPhoto
                    ? `
                  <div class="animate-spin text-brand-primary">
                    <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
                class="ios-tap absolute bottom-0 right-0 w-7 h-7 rounded-full bg-brand-primary text-brand-on-primary flex items-center justify-center cursor-pointer"
                title="Cambiar foto de perfil"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </label>
              <input type="file" id="input-avatar-file" accept="image/*" class="hidden" />
            </div>

            <!-- User Name and Edit Option -->
            <div class="text-center w-full max-w-xs shrink-0">
              ${
                isEditingName
                  ? `
                <form id="form-edit-name" class="flex items-center gap-2 mt-1">
                  <input 
                    type="text" 
                    id="input-display-name" 
                    value="${escapeHtml(profile.display_name)}" 
                    class="flex-1 h-10 px-3 rounded-[12px] bg-surface-elevated border border-brand-primary text-[15px] font-medium text-text-primary focus:outline-none"
                    required
                  />
                  <button type="submit" class="px-3.5 h-10 rounded-[12px] bg-brand-primary text-brand-on-primary text-[15px] font-semibold">
                    Guardar
                  </button>
                  <button type="button" id="btn-cancel-edit-name" class="px-2 h-10 rounded-[12px] text-[15px] text-text-secondary">
                    Cancelar
                  </button>
                </form>
              `
                  : `
                <div class="flex items-center justify-center gap-1.5">
                  <h3 class="ios-section-title">${escapeHtml(profile.display_name)}</h3>
                  <button id="btn-start-edit-name" class="text-brand-primary p-1" title="Editar nombre">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              `
              }
              <p class="ios-meta-text mt-0.5">${escapeHtml(profile.email)}</p>
              <span class="inline-block mt-2 px-3 py-0.5 rounded-full text-[13px] font-medium ${
                profile.role === 'admin'
                  ? 'bg-brand-primary text-brand-on-primary'
                  : 'bg-surface-inset text-text-secondary'
              }">
                ${profile.role === 'admin' ? 'Administrador' : 'Miembro'}
              </span>
            </div>
          </div>

          <!-- Admin Panel Button (Exclusive to Admin) -->
          ${
            profile.role === 'admin' && onOpenAdminPanel
              ? `
            <div class="w-full max-w-sm mx-auto ios-grouped-list shrink-0">
              <button 
                id="btn-open-admin"
                class="ios-grouped-row w-full text-left"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-[8px] bg-brand-primary text-brand-on-primary flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-[17px] font-normal text-text-primary">Panel de Administración</p>
                    <p class="text-[13px] text-text-secondary">Gestionar usuarios y grupos</p>
                  </div>
                </div>
                <svg class="w-4 h-4 text-text-disabled shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          `
              : ''
          }

          <!-- Preferencias Agrupadas (Inset Grouped) -->
          <div class="w-full max-w-sm mx-auto ios-grouped-list shrink-0">
            <!-- Notificaciones de Chat -->
            <div id="chat-notifications-card" class="ios-grouped-row gap-3">
              <div class="min-w-0">
                <p class="text-[17px] font-normal text-text-primary">Notificaciones de Chat</p>
                <p class="text-[13px] text-text-secondary">
                  ${
                    !chatNotificationsEnabled
                      ? 'Silenciadas en este dispositivo'
                      : getNotificationPermissionState() === 'denied'
                      ? 'Avisos en la app (permiso bloqueado)'
                      : 'Avisos de nuevos mensajes de tus grupos'
                  }
                </p>
              </div>
              <button
                type="button"
                id="btn-toggle-chat-notifications"
                aria-pressed="${chatNotificationsEnabled ? 'true' : 'false'}"
                class="px-3.5 py-1.5 rounded-[12px] text-[13px] font-semibold shrink-0 cursor-pointer ${
                  chatNotificationsEnabled
                    ? 'bg-status-online text-brand-on-primary'
                    : 'bg-surface-canvas text-text-secondary border border-border-strong'
                }"
              >
                ${chatNotificationsEnabled ? 'Activadas' : 'Desactivadas'}
              </button>
            </div>

            <!-- Selector de Zoom / Tamaño de Interfaz -->
            <div id="zoom-menu-card" class="ios-grouped-row flex-col !items-stretch !justify-start text-left gap-2">
              <button
                type="button"
                id="btn-toggle-zoom-menu"
                aria-expanded="${isZoomMenuOpen ? 'true' : 'false'}"
                class="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div class="min-w-0">
                  <p class="text-[17px] font-normal text-text-primary">Tamaño de Letra y Zoom</p>
                  <p class="text-[13px] text-text-secondary">
                    ${isZoomMenuOpen ? 'Selecciona un tamaño para toda la app' : `Actual: ${activeScaleOpt.label}`}
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-[15px] font-medium text-brand-primary tabular-nums">
                    ${activeScaleOpt.percentage}
                  </span>
                  <svg
                    class="w-4 h-4 text-text-disabled transition-transform ${isZoomMenuOpen ? 'rotate-180 text-brand-primary' : ''}"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              ${
                isZoomMenuOpen
                  ? `
                <div id="zoom-menu-options" class="pt-2 border-t border-border-subtle">
                  <div class="grid grid-cols-2 gap-2">
                    ${UI_SCALE_OPTIONS.map((opt) => {
                      const isActive = opt.id === currentScale;
                      return `
                        <button
                          type="button"
                          data-ui-scale="${opt.id}"
                          class="btn-ui-scale py-2.5 px-3 rounded-[12px] text-center flex items-center justify-between gap-2 border cursor-pointer ${
                            isActive
                              ? 'bg-brand-primary text-brand-on-primary border-brand-primary font-semibold'
                              : 'bg-surface-canvas text-text-primary border-border-strong font-medium'
                          }"
                        >
                          <span class="text-[13px]">${opt.label}</span>
                          <span class="text-[12px] opacity-85 tabular-nums">${opt.percentage}</span>
                        </button>
                      `;
                    }).join('')}
                  </div>
                </div>
              `
                  : ''
              }
            </div>
          </div>

          <!-- Info Cards Agrupadas (Inset Grouped) -->
          <div class="w-full max-w-sm mx-auto ios-grouped-list shrink-0">
            <div class="ios-grouped-row">
              <span class="text-[17px] text-text-primary">Estado de cuenta</span>
              <span class="text-[15px] text-status-online font-medium">Activa y Aprobada</span>
            </div>

            <div class="ios-grouped-row">
              <span class="text-[17px] text-text-primary">Privacidad</span>
              <span class="text-[15px] text-brand-primary font-medium">Cero Telemetría</span>
            </div>

            <div class="ios-grouped-row gap-3">
              <span class="text-[17px] text-text-primary shrink-0">Núcleo</span>
              <div id="profile-user-groups" class="flex flex-wrap items-center justify-end gap-1.5 text-right text-[13px]">
                ${renderUserGroupsContent()}
              </div>
            </div>
          </div>

        </div>

        <!-- DS-NAV-DOCK: Bottom Floating Navigation Slot -->
        <div id="profile-dock-slot"></div>

      </div>
    `;

    const nextScrollEl = container.querySelector(
      '#profile-scroll-container'
    ) as HTMLElement | null;
    if (nextScrollEl && prevScrollTop > 0) {
      nextScrollEl.scrollTop = prevScrollTop;
    }

    bindEvents();
  }

  function renderTabBarProfile(): void {
    const dockSlot = container.querySelector('#profile-dock-slot') as HTMLElement | null;
    if (dockSlot) {
      if (cleanupTabBar) {
        cleanupTabBar();
        cleanupTabBar = null;
      }
      const showGuia = userGroups.some((g) => g.guia_enabled);
      cleanupTabBar = renderFloatingTabBar(dockSlot, {
        activeTab: 'profile',
        showGuiaTab: showGuia,
        zIndexClass: 'z-[1100]',
        onNavigateTab,
        onActiveTabClick: () => {
          const scrollEl = container.querySelector('#profile-scroll-container') as HTMLElement | null;
          scrollEl?.scrollTo({ top: 0, behavior: 'smooth' });
        },
      });
    }
  }

  function bindEvents(): void {
    renderTabBarProfile();

    const scrollEl = container.querySelector('#profile-scroll-container') as HTMLElement | null;
    const compactTitleEl = container.querySelector('#profile-compact-title') as HTMLElement | null;
    scrollEl?.addEventListener?.('scroll', () => {
      if (!compactTitleEl) return;
      if (scrollEl.scrollTop > 28) {
        compactTitleEl.classList.remove('opacity-0');
      } else {
        compactTitleEl.classList.add('opacity-0');
      }
    });

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

    container.querySelector('#btn-toggle-chat-notifications')?.addEventListener('click', async () => {
      triggerHaptic('light');
      const nextState = !chatNotificationsEnabled;
      chatNotificationsEnabled = nextState;
      profile.chat_notifications_enabled = nextState;
      setStoredChatNotificationsEnabled(nextState);

      if (nextState) {
        try {
          await requestChatNotificationPermission();
        } catch {
          // Ignorar si el navegador no soporta permisos de notificación
        }
      }

      render();

      try {
        await profileService.updateChatNotifications(profile.uid, nextState);
      } catch (err) {
        console.warn('No se pudo sincronizar la preferencia de notificaciones en la nube:', err);
      }

      if (isFirebaseConfigured()) {
        const { db } = getFirebaseServices();
        void syncUserWebPushSubscription(db, profile);
      }
    });

    container.querySelector('#btn-toggle-zoom-menu')?.addEventListener('click', () => {
      triggerHaptic('light');
      isZoomMenuOpen = !isZoomMenuOpen;
      render();
      if (isZoomMenuOpen) {
        const zoomOptionsEl = container.querySelector('#zoom-menu-options') as HTMLElement | null;
        zoomOptionsEl?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      }
    });

    // Selector de escala visual (Zoom de interfaz)
    container.querySelectorAll('.btn-ui-scale').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const rawScale = (btn as HTMLElement).dataset.uiScale;
        if (!isValidUiScale(rawScale)) return;

        triggerHaptic('light');
        const changed = rawScale !== currentScale;
        if (changed) {
          currentScale = applyUiScale(rawScale);
          profile.ui_scale = currentScale;
        }
        isZoomMenuOpen = false;
        render();

        if (changed) {
          try {
            await profileService.updateUiScale(profile.uid, currentScale);
          } catch (err) {
            console.warn('No se pudo sincronizar la escala visual en la nube:', err);
          }
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
      renderTabBarProfile();
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

