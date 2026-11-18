import type { AdminService } from '../admin_service';
import type { UserProfile } from '../../auth/types';

export interface AdminViewOptions {
  adminService: AdminService;
  currentAdminUid: string;
  onClose: () => void;
}

export function renderAdminView(
  container: HTMLElement,
  options: AdminViewOptions
): () => void {
  const { adminService, currentAdminUid, onClose } = options;
  let pendingMembers: UserProfile[] = [];
  let activeMembers: UserProfile[] = [];
  let isRegistrationOpen = true;
  let isProcessing = false;

  // Cargar estado inicial del sistema
  adminService.getSystemConfig().then((cfg) => {
    isRegistrationOpen = cfg.registration_open;
    updateRegistrationToggleUI();
  });

  container.innerHTML = `
    <div class="fixed inset-0 z-[1500] bg-surface-canvas flex flex-col overflow-hidden text-text-primary safe-top safe-bottom">
      
      <!-- Top Bar -->
      <header class="min-h-16 shrink-0 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2 border-b border-border-subtle glass-panel flex items-center justify-between z-10">
        <div class="flex items-center gap-2.5">
          <button 
            id="admin-btn-back" 
            class="w-9 h-9 rounded-full bg-surface-card border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors active:scale-95"
            title="Volver"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 class="text-sm font-extrabold tracking-tight text-text-primary">Administración Familiar</h1>
        </div>
        <span class="px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-[11px] font-bold">
          Modo Admin
        </span>
      </header>

      <!-- Scrollable Admin Content -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6 max-w-lg mx-auto w-full pb-16">
        
        <!-- Section 1: Switch de Registro Familiar -->
        <div class="p-4 rounded-3xl glass-panel shadow-xs flex items-center justify-between">
          <div>
            <h2 class="text-xs font-bold text-text-primary">Registro Familiar</h2>
            <p id="reg-status-text" class="text-[11px] text-text-secondary mt-0.5">
              ${isRegistrationOpen ? 'Permitiendo solicitudes de alta' : 'Registro cerrado a nuevas altas'}
            </p>
          </div>
          <button 
            id="btn-toggle-reg" 
            class="px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs ${
              isRegistrationOpen
                ? 'bg-status-online text-white hover:opacity-90'
                : 'bg-surface-elevated text-text-disabled hover:text-text-primary'
            }"
          >
            ${isRegistrationOpen ? 'Abierto' : 'Cerrado'}
          </button>
        </div>

        <!-- Section 2: Solicitudes Pendientes de Aprobación -->
        <div class="flex flex-col gap-2.5">
          <div class="flex items-center justify-between px-1">
            <h2 class="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Solicitudes Pendientes
            </h2>
            <span id="pending-count-badge" class="text-[11px] font-bold text-brand-primary">
              0 pendientes
            </span>
          </div>

          <div id="pending-list-container" class="flex flex-col gap-2">
            <div class="p-4 rounded-2xl bg-surface-base border border-border-subtle text-center text-xs text-text-disabled">
              No hay solicitudes pendientes en este momento.
            </div>
          </div>
        </div>

        <!-- Section 3: Usuarios Registrados / Activos -->
        <div class="flex flex-col gap-2.5">
          <div class="flex items-center justify-between px-1">
            <h2 class="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Usuarios Registrados
            </h2>
            <span id="members-count-badge" class="text-[11px] font-bold text-text-secondary">
              0 familiares
            </span>
          </div>

          <!-- Quota Alert Banner (>15 members) -->
          <div id="members-quota-alert" class="hidden"></div>

          <!-- Members records list -->
          <div id="members-list-container" class="flex flex-col gap-2 mt-1">
            <div class="p-4 rounded-2xl bg-surface-base border border-border-subtle text-center text-xs text-text-disabled">
              Cargando usuarios registrados...
            </div>
          </div>
        </div>

      </div>

    </div>
  `;

  // Bind Switch de Registro
  function updateRegistrationToggleUI(): void {
    const btn = container.querySelector('#btn-toggle-reg') as HTMLButtonElement | null;
    const txt = container.querySelector('#reg-status-text') as HTMLElement | null;
    if (!btn || !txt) return;

    if (isRegistrationOpen) {
      btn.className = 'px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs bg-status-online text-white hover:opacity-90';
      btn.textContent = 'Abierto';
      txt.textContent = 'Permitiendo solicitudes de alta';
    } else {
      btn.className = 'px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs bg-surface-elevated text-text-disabled hover:text-text-primary';
      btn.textContent = 'Cerrado';
      txt.textContent = 'Registro cerrado a nuevas altas';
    }
  }

  container.querySelector('#btn-toggle-reg')?.addEventListener('click', async () => {
    if (isProcessing) return;
    isProcessing = true;
    try {
      const next = !isRegistrationOpen;
      await adminService.setRegistrationOpen(next);
      isRegistrationOpen = next;
      updateRegistrationToggleUI();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al modificar configuración.');
    } finally {
      isProcessing = false;
    }
  });

  // Botón volver
  container.querySelector('#admin-btn-back')?.addEventListener('click', () => {
    onClose();
  });

  // Suscribirse a solicitudes pendientes
  const unsubPending = adminService.subscribeToPendingMembers((members) => {
    pendingMembers = members;
    renderPendingList();
  });

  // Suscribirse a miembros activos registrados
  const unsubMembers = adminService.subscribeToAllMembers((members) => {
    activeMembers = members;
    renderMembersList();
  });

  function renderPendingList(): void {
    const listEl = container.querySelector('#pending-list-container');
    const badgeEl = container.querySelector('#pending-count-badge');
    if (!listEl || !badgeEl) return;

    badgeEl.textContent = `${pendingMembers.length} pendientes`;

    if (pendingMembers.length === 0) {
      listEl.innerHTML = `
        <div class="p-4 rounded-2xl bg-surface-base border border-border-subtle text-center text-xs text-text-disabled">
          No hay solicitudes pendientes en este momento.
        </div>
      `;
      return;
    }

    listEl.innerHTML = pendingMembers
      .map(
        (m) => `
        <div class="p-3.5 rounded-2xl glass-panel shadow-xs flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 overflow-hidden">
            <div class="w-9 h-9 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold shrink-0">
              ${(m.display_name || 'F')[0].toUpperCase()}
            </div>
            <div class="truncate">
              <p class="text-xs font-bold text-text-primary truncate">${escapeHtml(m.display_name)}</p>
              <p class="text-[11px] text-text-secondary truncate">${escapeHtml(m.email)}</p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button 
              data-approve-uid="${m.uid}" 
              class="btn-approve px-3 py-1.5 rounded-full bg-status-online text-white text-[11px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-xs"
            >
              Aprobar
            </button>
            <button 
              data-reject-uid="${m.uid}" 
              class="btn-reject px-3 py-1.5 rounded-full bg-surface-elevated text-status-error text-[11px] font-bold hover:bg-status-error/10 active:scale-95 transition-all"
            >
              Rechazar
            </button>
          </div>
        </div>
      `
      )
      .join('');

    // Bind botones de aprobación y rechazo
    listEl.querySelectorAll('.btn-approve').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const uid = (btn as HTMLElement).dataset.approveUid;
        if (!uid) return;
        try {
          await adminService.approveMember(uid);
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Error al aprobar solicitud.');
        }
      });
    });

    listEl.querySelectorAll('.btn-reject').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const uid = (btn as HTMLElement).dataset.rejectUid;
        if (!uid) return;
        if (!confirm('¿Rechazar el acceso a este usuario?')) return;
        try {
          await adminService.rejectMember(uid);
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Error al rechazar solicitud.');
        }
      });
    });
  }

  function renderMembersList(): void {
    const listEl = container.querySelector('#members-list-container');
    const badgeEl = container.querySelector('#members-count-badge');
    const alertEl = container.querySelector('#members-quota-alert');
    if (!listEl || !badgeEl) return;

    const totalCount = activeMembers.length;
    badgeEl.textContent = `${totalCount} familiares`;

    // Aviso de cuota Firebase Spark si supera 15 usuarios
    if (alertEl) {
      if (totalCount > 15) {
        alertEl.className = 'p-3.5 rounded-2xl bg-status-warning/15 border border-status-warning/40 text-xs flex items-start gap-2.5';
        alertEl.innerHTML = `
          <svg class="w-5 h-5 text-status-warning shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p class="font-bold text-text-primary">Aviso: ${totalCount} familiares registrados</p>
            <p class="text-[11px] text-text-secondary mt-0.5 leading-snug">
              Al superar 15 miembros se aconseja monitorizar las cuotas diarias del plan gratuito Spark de Firebase para evitar saturar las lecturas en tiempo real.
            </p>
          </div>
        `;
      } else {
        alertEl.className = 'hidden';
        alertEl.innerHTML = '';
      }
    }

    if (totalCount === 0) {
      listEl.innerHTML = `
        <div class="p-4 rounded-2xl bg-surface-base border border-border-subtle text-center text-xs text-text-disabled">
          No hay usuarios activos registrados aún.
        </div>
      `;
      return;
    }

    listEl.innerHTML = activeMembers
      .map(
        (m) => {
          const isSelf = m.uid === currentAdminUid;
          const initial = (m.display_name || 'F')[0].toUpperCase();

          return `
          <div class="p-3 rounded-2xl glass-panel shadow-xs flex items-center justify-between text-xs">
            <div class="flex items-center gap-2.5 truncate">
              <div class="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                ${
                  m.photo_url
                    ? `<img src="${escapeHtml(m.photo_url)}" alt="${escapeHtml(m.display_name)}" class="w-full h-full object-cover" />`
                    : initial
                }
              </div>
              <div class="truncate">
                <p class="font-bold text-text-primary truncate flex items-center gap-1.5">
                  ${escapeHtml(m.display_name)}
                  ${isSelf ? '<span class="text-[10px] text-brand-primary font-normal">(Tú)</span>' : ''}
                </p>
                <p class="text-[11px] text-text-secondary truncate">${escapeHtml(m.email)}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-[10px] uppercase font-bold text-text-secondary px-2 py-0.5 rounded-full bg-surface-base">
                ${m.role === 'admin' ? 'Admin' : 'Familiar'}
              </span>
              ${
                !isSelf
                  ? `
                <button 
                  data-purge-uid="${m.uid}" 
                  data-purge-name="${escapeHtml(m.display_name)}"
                  class="btn-purge-member p-1.5 text-text-disabled hover:text-status-error active:scale-90 transition-all rounded-full hover:bg-status-error/10"
                  title="Eliminar usuario familiar"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              `
                  : ''
              }
            </div>
          </div>
        `;
        }
      )
      .join('');

    // Bind eliminación de usuarios
    listEl.querySelectorAll('.btn-purge-member').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const uid = (btn as HTMLElement).dataset.purgeUid;
        const name = (btn as HTMLElement).dataset.purgeName || 'este usuario';
        if (!uid) return;

        if (!confirm(`¿Eliminar y desvincular a ${name} del núcleo familiar?\n\nPerderá el acceso de inmediato y podrá registrarse de nuevo si lo desea.`)) {
          return;
        }

        try {
          await adminService.purgeMember(uid, currentAdminUid);
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Error al eliminar usuario.');
        }
      });
    });
  }

  return () => {
    unsubPending();
    unsubMembers();
  };
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
