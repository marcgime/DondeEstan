import type { ProfileService } from '../profile_service';
import { compressAndCropAvatar } from '../image_compressor';
import type { UserProfile } from '../../auth/types';
import { triggerHaptic } from '../../ui/utils/haptics';

export interface ProfileViewOptions {
  profile: UserProfile;
  profileService: ProfileService;
  onNavigateTab: (tab: 'map' | 'chat' | 'profile') => void;
  onOpenAdminPanel?: () => void;
  onLogout: () => Promise<void>;
}

export function renderProfileView(
  container: HTMLElement,
  options: ProfileViewOptions
): () => void {
  const { profile, profileService, onNavigateTab, onOpenAdminPanel, onLogout } = options;
  const initial = (profile.display_name || 'F')[0].toUpperCase();
  let isEditingName = false;
  let isUploadingPhoto = false;

  function render(): void {
    container.innerHTML = `
      <div class="relative h-full w-full flex flex-col bg-surface-canvas text-text-primary overflow-hidden">
        
        <!-- Top Header -->
        <header class="h-16 shrink-0 px-4 safe-top flex items-center justify-between border-b border-border-subtle bg-surface-glass backdrop-blur-xl z-20">
          <h1 class="text-sm font-bold text-text-primary">Mi Perfil Familiar</h1>
          <button 
            id="profile-btn-logout"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-card border border-border-subtle text-status-error text-xs font-semibold hover:bg-status-error/10 transition-colors"
            title="Cerrar sesión"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Salir</span>
          </button>
        </header>

        <!-- Profile Content -->
        <div class="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-5 pb-32">
          
          <!-- Avatar Big with Upload Badge -->
          <div class="relative mt-2">
            <div class="w-24 h-24 rounded-full border-4 border-brand-primary/20 bg-surface-card overflow-hidden flex items-center justify-center text-3xl font-extrabold text-brand-primary shadow-card">
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
              ${profile.role === 'admin' ? 'Administrador Familiar' : 'Miembro Familiar'}
            </span>
          </div>

          <!-- Admin Panel Button (Exclusive to Admin) -->
          ${
            profile.role === 'admin' && onOpenAdminPanel
              ? `
            <div class="w-full max-w-sm mt-1">
              <button 
                id="btn-open-admin"
                class="w-full p-4 rounded-2xl bg-surface-glass border border-brand-primary/40 text-brand-primary font-bold text-xs flex items-center justify-between shadow-dock hover:bg-brand-primary/5 active:scale-98 transition-all"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div class="text-left">
                    <p class="text-text-primary text-xs font-bold">Panel de Administración</p>
                    <p class="text-[11px] text-text-secondary font-normal">Aprobar familiares y lista blanca</p>
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

          <!-- Info Cards -->
          <div class="w-full max-w-sm flex flex-col gap-2.5 mt-1">
            <div class="p-3.5 rounded-2xl bg-surface-glass border border-surface-glass-border shadow-xs flex items-center justify-between text-xs">
              <span class="font-bold text-text-secondary">Estado de cuenta</span>
              <span class="text-status-online font-bold uppercase tracking-wider">Activa y Aprobada</span>
            </div>

            <div class="p-3.5 rounded-2xl bg-surface-glass border border-surface-glass-border shadow-xs flex items-center justify-between text-xs">
              <span class="font-bold text-text-secondary">Privacidad</span>
              <span class="text-brand-primary font-bold">Cero Telemetría</span>
            </div>

            <div class="p-3.5 rounded-2xl bg-surface-glass border border-surface-glass-border shadow-xs flex items-center justify-between text-xs">
              <span class="font-bold text-text-secondary">Núcleo</span>
              <span class="text-text-primary font-bold">Familiar privado (sin límite)</span>
            </div>
          </div>

        </div>

        <!-- DS-NAV-DOCK: Bottom Floating Glass Navigation -->
        <nav class="absolute inset-x-4 bottom-4 z-[1100] safe-bottom">
          <div class="max-w-xs mx-auto h-14 rounded-full bg-surface-glass backdrop-blur-2xl border border-surface-glass-border shadow-dock flex items-center justify-around px-2">
            
            <!-- Map Tab -->
            <button 
              id="nav-profile-map" 
              class="flex items-center gap-1.5 px-4 py-2 rounded-full text-text-secondary hover:text-text-primary text-xs font-bold transition-all"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>Mapa</span>
            </button>

            <!-- Chat Tab -->
            <button 
              id="nav-profile-chat" 
              class="flex items-center gap-1.5 px-4 py-2 rounded-full text-text-secondary hover:text-text-primary text-xs font-bold transition-all"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Chat</span>
            </button>

            <!-- Settings Tab (Active) -->
            <button class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-primary text-brand-on-primary text-xs font-bold shadow-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Perfil</span>
            </button>

          </div>
        </nav>

      </div>
    `;

    bindEvents();
  }

  function bindEvents(): void {
    container.querySelector('#nav-profile-map')?.addEventListener('click', () => {
      triggerHaptic('light');
      onNavigateTab('map');
    });

    container.querySelector('#nav-profile-chat')?.addEventListener('click', () => {
      triggerHaptic('light');
      onNavigateTab('chat');
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
  return () => {};
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

