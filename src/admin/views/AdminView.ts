import type { AdminService } from '../admin_service';
import type { GroupService } from '../group_service';
import type { Group } from '../types';
import type { UserProfile } from '../../auth/types';

export interface AdminViewOptions {
  adminService: AdminService;
  groupService: GroupService;
  currentAdminUid: string;
  onClose: () => void;
}

export function renderAdminView(
  container: HTMLElement,
  options: AdminViewOptions
): () => void {
  const { adminService, groupService, currentAdminUid, onClose } = options;
  let pendingMembers: UserProfile[] = [];
  let activeMembers: UserProfile[] = [];
  let groups: Group[] = [];
  let isRegistrationOpen = true;
  let isProcessing = false;

  // Cargar estado inicial del sistema
  adminService.getSystemConfig().then((cfg) => {
    isRegistrationOpen = cfg.registration_open;
    updateRegistrationToggleUI();
  });

  container.innerHTML = `
    <div id="admin-view-root" class="relative h-full w-full bg-surface-canvas flex flex-col overflow-hidden overscroll-contain-y text-text-primary safe-bottom">
      
      <!-- iOS Nav Bar (Opaca, sin blur; título centrado aparece al hacer scroll) -->
      <header class="ios-nav-bar safe-header-top">
        <button 
          id="admin-btn-back" 
          class="flex items-center gap-1 px-2 py-1 rounded-[12px] text-brand-primary text-[15px] font-medium"
          title="Volver a Perfil"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Perfil</span>
        </button>
        <h1 id="admin-compact-title" class="ios-nav-title-compact opacity-0 pointer-events-none">Administración</h1>
        <span class="text-[13px] font-medium text-text-secondary w-16 text-right">
          Admin
        </span>
      </header>

      <!-- Scrollable Admin Content -->
      <div id="admin-scroll-container" class="flex-1 overflow-y-auto overscroll-contain-y px-4 sm:px-5 pt-2 flex flex-col gap-6 max-w-lg mx-auto w-full pb-20">
        
        <!-- Large Title -->
        <div>
          <h2 class="ios-large-title">Administración</h2>
        </div>

        <!-- Section 1: Switch de Registro (Inset Grouped) -->
        <div class="ios-grouped-list">
          <div class="ios-grouped-row">
            <div>
              <h3 class="text-[17px] font-normal text-text-primary">Registro</h3>
              <p id="reg-status-text" class="text-[13px] text-text-secondary mt-0.5">
                ${isRegistrationOpen ? 'Permitiendo solicitudes de alta' : 'Registro cerrado a nuevas altas'}
              </p>
            </div>
            <button 
              id="btn-toggle-reg" 
              class="px-3.5 py-1.5 rounded-[12px] text-[13px] font-semibold ${
                isRegistrationOpen
                  ? 'bg-status-online text-brand-on-primary'
                  : 'bg-surface-canvas text-text-secondary border border-border-strong'
              }"
            >
              ${isRegistrationOpen ? 'Abierto' : 'Cerrado'}
            </button>
          </div>
        </div>

        <!-- Section 2: Solicitudes Pendientes de Aprobación -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between px-1">
            <h3 class="text-[13px] font-medium uppercase tracking-[0.01em] text-text-secondary">
              Solicitudes Pendientes
            </h3>
            <span id="pending-count-badge" class="text-[13px] font-medium text-brand-primary tabular-nums">
              0 pendientes
            </span>
          </div>

          <div id="pending-list-container" class="ios-grouped-list">
            <div class="p-4 text-center text-[13px] text-text-disabled">
              Sin solicitudes pendientes
            </div>
          </div>
        </div>

        <!-- Section 3: Grupos (Gestión de Grupos) -->
        <div class="flex flex-col gap-2.5">
          <div class="flex items-center justify-between px-1">
            <h3 class="text-[13px] font-medium uppercase tracking-[0.01em] text-text-secondary">
              Grupos
            </h3>
            <span id="groups-count-badge" class="text-[13px] font-medium text-brand-primary tabular-nums">
              0 grupos
            </span>
          </div>

          <!-- Formulario Crear Nuevo Grupo -->
          <form id="form-create-group" class="flex gap-2">
            <input 
              type="text" 
              id="input-group-name" 
              placeholder="Nuevo grupo (ej: Hijos, Vacaciones)..." 
              maxlength="50"
              class="flex-1 h-11 px-3.5 rounded-[12px] bg-surface-elevated border border-border-strong text-[15px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand-primary transition-colors"
            />
            <button 
              type="submit" 
              id="btn-submit-group"
              class="px-4 h-11 rounded-[12px] bg-brand-primary text-brand-on-primary font-semibold text-[15px] shrink-0"
            >
              Crear
            </button>
          </form>

          <!-- Listado de Grupos -->
          <div id="groups-list-container" class="ios-grouped-list mt-1">
            <div class="p-4 text-center text-[13px] text-text-disabled">
              Cargando grupos...
            </div>
          </div>
        </div>

        <!-- Section 4: Usuarios Registrados -->
        <div class="flex flex-col gap-2.5">
          <div class="flex items-center justify-between px-1">
            <h3 class="text-[13px] font-medium uppercase tracking-[0.01em] text-text-secondary">
              Usuarios Registrados
            </h3>
            <span id="members-count-badge" class="text-[13px] font-medium text-text-secondary tabular-nums">
              0 usuarios
            </span>
          </div>

          <!-- Quota Alert Banner (>15 members) -->
          <div id="members-quota-alert" class="hidden"></div>

          <!-- Members records list -->
          <div id="members-list-container" class="ios-grouped-list mt-1">
            <div class="p-4 text-center text-[13px] text-text-disabled">
              Cargando usuarios registrados...
            </div>
          </div>
        </div>

      </div>

    </div>
  `;

  const adminScrollEl = container.querySelector('#admin-scroll-container') as HTMLElement | null;
  const adminCompactTitleEl = container.querySelector('#admin-compact-title') as HTMLElement | null;
  adminScrollEl?.addEventListener('scroll', () => {
    if (!adminCompactTitleEl) return;
    if (adminScrollEl.scrollTop > 28) {
      adminCompactTitleEl.classList.remove('opacity-0');
    } else {
      adminCompactTitleEl.classList.add('opacity-0');
    }
  });

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

  // Formulario Crear Grupo
  const groupForm = container.querySelector('#form-create-group') as HTMLFormElement | null;
  const groupInput = container.querySelector('#input-group-name') as HTMLInputElement | null;
  groupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!groupInput) return;
    const name = groupInput.value.trim();
    if (!name) return;

    try {
      await groupService.createGroup(name, currentAdminUid);
      groupInput.value = '';
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear grupo.');
    }
  });

  // Suscribirse a solicitudes pendientes
  const unsubPending = adminService.subscribeToPendingMembers((members) => {
    pendingMembers = members;
    renderPendingList();
  });

  // Suscribirse a grupos
  const unsubGroups = groupService.subscribeToGroups((gList) => {
    groups = gList;
    renderGroupsList();
    renderMembersList(); // Re-renderizar miembros para actualizar etiquetas de grupo
  });

  // Suscribirse a miembros activos registrados
  const unsubMembers = adminService.subscribeToAllMembers((members) => {
    activeMembers = members;
    renderMembersList();
    renderGroupsList(); // Re-renderizar conteo de miembros en grupos
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
        <div class="ios-grouped-row gap-3">
          <div class="flex items-center gap-3 overflow-hidden">
            <div class="w-9 h-9 rounded-full bg-surface-inset text-text-primary flex items-center justify-center text-[13px] font-semibold shrink-0">
              ${(m.display_name || 'F')[0].toUpperCase()}
            </div>
            <div class="truncate">
              <p class="text-[15px] font-medium text-text-primary truncate">${escapeHtml(m.display_name)}</p>
              <p class="text-[13px] text-text-secondary truncate">${escapeHtml(m.email)}</p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button 
              data-approve-uid="${m.uid}" 
              class="btn-approve px-3 py-1.5 rounded-[10px] bg-status-online text-brand-on-primary text-[13px] font-semibold"
            >
              Aprobar
            </button>
            <button 
              data-reject-uid="${m.uid}" 
              class="btn-reject px-3 py-1.5 rounded-[10px] bg-surface-canvas border border-border-strong text-status-error text-[13px] font-semibold"
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

  function renderGroupsList(): void {
    const listEl = container.querySelector('#groups-list-container');
    const badgeEl = container.querySelector('#groups-count-badge');
    if (!listEl || !badgeEl) return;

    badgeEl.textContent = `${groups.length} grupos`;

    if (groups.length === 0) {
      listEl.innerHTML = `
        <div class="p-4 rounded-2xl bg-surface-base border border-border-subtle text-center text-xs text-text-disabled">
          No hay grupos creados aún. Crea el primero arriba.
        </div>
      `;
      return;
    }

    listEl.innerHTML = groups
      .map((g) => {
        const memberCount = activeMembers.filter((m) =>
          m.role === 'admin' || (Array.isArray(m.groupIds) && m.groupIds.includes(g.id))
        ).length;

        return `
          <div class="ios-grouped-row text-[15px]">
            <div class="flex items-center gap-3 truncate">
              <div class="w-8 h-8 rounded-[8px] bg-surface-inset text-text-primary flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div class="truncate">
                <p class="font-medium text-text-primary truncate">${escapeHtml(g.name)}</p>
                <p class="text-[13px] text-text-secondary tabular-nums">${memberCount} ${memberCount === 1 ? 'miembro' : 'miembros'}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <!-- Botón Toggle GuIA -->
              <button 
                type="button"
                data-toggle-guia-group-id="${g.id}"
                data-toggle-guia-current="${g.guia_enabled ? 'true' : 'false'}"
                class="btn-toggle-guia px-2.5 py-1 rounded-[10px] text-[12px] font-semibold flex items-center gap-1 ${
                  g.guia_enabled
                    ? 'bg-status-online text-brand-on-primary'
                    : 'bg-surface-canvas text-text-secondary border border-border-strong'
                }"
                title="${g.guia_enabled ? 'Deshabilitar pestaña GuIA para este grupo' : 'Habilitar pestaña GuIA para este grupo'}"
              >
                <span>${g.guia_enabled ? 'GuIA On' : 'GuIA Off'}</span>
              </button>

              <button 
                data-delete-group-id="${g.id}"
                data-delete-group-name="${escapeHtml(g.name)}"
                class="btn-delete-group p-1.5 text-text-disabled hover:text-status-error rounded-[8px]"
                title="Eliminar grupo"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    // Bind toggle GuIA por grupo
    listEl.querySelectorAll('.btn-toggle-guia').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const gid = (btn as HTMLElement).dataset.toggleGuiaGroupId;
        const currentVal = (btn as HTMLElement).dataset.toggleGuiaCurrent === 'true';
        if (!gid) return;

        try {
          await groupService.setGroupGuiaEnabled(gid, !currentVal);
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Error al modificar estado de GuIA.');
        }
      });
    });

    // Bind eliminación de grupos
    listEl.querySelectorAll('.btn-delete-group').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const gid = (btn as HTMLElement).dataset.deleteGroupId;
        const gname = (btn as HTMLElement).dataset.deleteGroupName || 'este grupo';
        if (!gid) return;

        if (
          !confirm(
            `¿Eliminar el grupo "${gname}"?\n\nLos usuarios que solo pertenezcan a este grupo quedarán en estado de espera hasta ser asignados a otro.`
          )
        ) {
          return;
        }

        try {
          await groupService.deleteGroup(gid);
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Error al eliminar grupo.');
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
    badgeEl.textContent = `${totalCount} usuarios`;

    // Quota banner > 15
    if (alertEl) {
      if (totalCount > 15) {
        alertEl.className = 'p-3.5 rounded-2xl bg-status-warning/15 border border-status-warning/40 text-xs flex items-start gap-2.5';
        alertEl.innerHTML = `
          <svg class="w-5 h-5 text-status-warning shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p class="font-bold text-text-primary">Aviso: ${totalCount} usuarios registrados</p>
            <p class="text-[0.75rem] text-text-secondary mt-0.5 leading-snug">
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
      .map((m) => {
        const isSelf = m.uid === currentAdminUid;
        const initial = (m.display_name || 'F')[0].toUpperCase();

        // Obtener globos interactivos de los grupos
        let groupBadgesHtml = '';
        if (m.role === 'admin') {
          groupBadgesHtml = `<span class="px-2.5 py-1 rounded-full text-[0.6875rem] font-bold bg-brand-primary/10 text-brand-primary">Todos los grupos (Admin)</span>`;
        } else {
          const userGroupIds = Array.isArray(m.groupIds) ? m.groupIds : [];
          if (groups.length === 0) {
            groupBadgesHtml = `<span class="text-[0.6875rem] text-text-disabled italic">No hay grupos creados</span>`;
          } else {
            groupBadgesHtml = groups
              .map((g) => {
                const isAssigned = userGroupIds.includes(g.id);
                if (isAssigned) {
                  return `
                    <button 
                      data-toggle-uid="${m.uid}"
                      data-toggle-group-id="${g.id}"
                      class="btn-toggle-group px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 bg-status-online/15 text-status-online border border-status-online/40 hover:opacity-80"
                      title="Asignado a ${escapeHtml(g.name)}. Pulsa para desasignar."
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-status-online shrink-0"></span>
                      ${escapeHtml(g.name)}
                    </button>
                  `;
                } else {
                  return `
                    <button 
                      data-toggle-uid="${m.uid}"
                      data-toggle-group-id="${g.id}"
                      class="btn-toggle-group px-2.5 py-0.5 rounded-full text-[0.6875rem] font-medium transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 bg-surface-elevated text-text-disabled border border-border-subtle hover:text-text-primary hover:border-border-strong opacity-70 hover:opacity-100"
                      title="No asignado a ${escapeHtml(g.name)}. Pulsa para asignar."
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-border-strong shrink-0"></span>
                      ${escapeHtml(g.name)}
                    </button>
                  `;
                }
              })
              .join('');
          }
        }

        return `
          <div class="ios-grouped-row flex-col !items-stretch !justify-start text-left gap-2.5 text-[15px]">
            <div class="w-full flex items-center justify-between gap-2">
              <div class="flex items-center gap-3 truncate">
                <div class="w-9 h-9 rounded-full bg-surface-inset text-text-primary flex items-center justify-center font-semibold text-[13px] shrink-0 overflow-hidden">
                  ${
                    m.photo_url
                      ? `<img src="${escapeHtml(m.photo_url)}" alt="${escapeHtml(m.display_name)}" class="w-full h-full object-cover" />`
                      : initial
                  }
                </div>
                <div class="truncate">
                  <p class="font-medium text-text-primary truncate flex items-center gap-1.5">
                    ${escapeHtml(m.display_name)}
                    ${isSelf ? '<span class="text-[13px] text-brand-primary font-normal">(Tú)</span>' : ''}
                  </p>
                  <p class="text-[13px] text-text-secondary truncate">${escapeHtml(m.email)}</p>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                ${
                  !isSelf
                    ? `
                  <button 
                    data-purge-uid="${m.uid}" 
                    data-purge-email="${escapeHtml(m.email)}"
                    data-purge-name="${escapeHtml(m.display_name)}"
                    class="btn-purge-member p-1.5 text-text-disabled hover:text-status-error rounded-[8px]"
                    title="Eliminar usuario"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                `
                    : ''
                }
              </div>
            </div>

            <!-- Globos interactivos de Grupos -->
            <div class="flex flex-wrap gap-1.5 items-center pt-1">
              <span class="text-[12px] text-text-secondary font-medium mr-0.5">Grupos:</span>
              ${groupBadgesHtml}
            </div>
          </div>
        `;
      })
      .join('');

    // Bind toggle directo de grupos desde los globos interactivos
    listEl.querySelectorAll('.btn-toggle-group').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const uid = (btn as HTMLElement).dataset.toggleUid;
        const gid = (btn as HTMLElement).dataset.toggleGroupId;
        if (!uid || !gid) return;

        const member = activeMembers.find((m) => m.uid === uid);
        if (!member) return;

        const currentGroupIds = Array.isArray(member.groupIds) ? [...member.groupIds] : [];
        let nextGroupIds: string[];
        if (currentGroupIds.includes(gid)) {
          nextGroupIds = currentGroupIds.filter((id) => id !== gid);
        } else {
          nextGroupIds = [...currentGroupIds, gid];
        }

        // Actualización optimista inmediata en la UI
        member.groupIds = nextGroupIds;
        renderMembersList();
        renderGroupsList();

        try {
          await groupService.assignUserGroups(uid, nextGroupIds);
        } catch (err) {
          // Revertir en caso de error
          member.groupIds = currentGroupIds;
          renderMembersList();
          renderGroupsList();
          alert(err instanceof Error ? err.message : 'Error al modificar asignación de grupo.');
        }
      });
    });

    // Bind eliminación de usuarios
    listEl.querySelectorAll('.btn-purge-member').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const uid = (btn as HTMLElement).dataset.purgeUid;
        const email = (btn as HTMLElement).dataset.purgeEmail;
        const name = (btn as HTMLElement).dataset.purgeName || 'este usuario';
        if (!uid) return;

        if (
          !confirm(
            `¿Eliminar y desvincular a ${name} de la aplicación?\n\nSe eliminará de la base de datos y de Authentication, perdiendo el acceso de inmediato.`
          )
        ) {
          return;
        }

        try {
          await adminService.purgeMember(uid, currentAdminUid, email);
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Error al eliminar usuario.');
        }
      });
    });
  }

  return () => {
    unsubPending();
    unsubGroups();
    unsubMembers();
  };
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
