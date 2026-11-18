import type { FamilyChatService } from '../chat_service';
import type { ChatMessage, ChatSender } from '../types';
import type { GroupService } from '../../admin/group_service';
import type { Group } from '../../admin/types';
import type { UserProfile } from '../../auth/types';
import { triggerHaptic } from '../../ui/utils/haptics';

export interface ChatViewOptions {
  currentUser: ChatSender;
  chatService: FamilyChatService;
  groupService?: GroupService;
  userProfile?: UserProfile;
  onNavigateTab: (tab: 'map' | 'chat' | 'profile') => void;
  onLogout?: () => Promise<void>;
}

export function renderChatView(
  container: HTMLElement,
  options: ChatViewOptions
): () => void {
  const { currentUser, chatService, groupService, userProfile, onNavigateTab } = options;
  let isSending = false;
  let chatUnsubscribe: (() => void) | null = null;
  let groupsUnsubscribe: (() => void) | null = null;
  let accessibleGroups: Group[] = [];
  let activeGroupId: string = '';

  container.innerHTML = `
    <div class="relative h-full w-full flex flex-col bg-surface-canvas text-text-primary overflow-hidden">
      
      <!-- Top Header -->
      <header class="min-h-16 shrink-0 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2 flex items-center justify-between border-b border-border-subtle glass-panel z-20 gap-2">
        <div class="flex items-center gap-3 truncate">
          <div class="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div id="chat-header-group-slot" class="truncate">
            <h1 class="text-sm font-bold text-text-primary flex items-center gap-2">
              Chat
              <span class="w-2 h-2 rounded-full bg-status-online"></span>
            </h1>
            <p class="text-[11px] text-text-secondary">Mensajería instantánea segura</p>
          </div>
        </div>
      </header>

      <!-- Messages Stream List -->
      <div 
        id="chat-messages-container" 
        class="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 pb-36"
      >
        <div class="my-auto text-center p-6 text-text-disabled text-xs">
          <div class="w-8 h-8 mx-auto mb-2 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center animate-pulse">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          Cargando mensajes del canal...
        </div>
      </div>

      <!-- Message Composer Bar (Floating above Bottom Dock) -->
      <div class="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] z-20">
        <form 
          id="chat-composer-form" 
          class="max-w-md mx-auto flex items-center gap-2 p-1.5 rounded-full glass-panel shadow-dock"
        >
          <input 
            type="text" 
            id="chat-input-text"
            maxlength="500"
            autocomplete="off"
            placeholder="Mensaje..."
            class="flex-1 h-10 px-4 rounded-full bg-transparent text-text-primary placeholder:text-text-disabled text-sm focus:outline-none"
          />
          <button 
            type="submit" 
            id="chat-btn-send"
            class="w-10 h-10 shrink-0 rounded-full bg-brand-primary text-brand-on-primary flex items-center justify-center hover:opacity-95 active:scale-95 disabled:opacity-50 transition-all shadow-sm"
            title="Enviar mensaje"
          >
            <svg class="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>

      <!-- DS-NAV-DOCK: Bottom Floating Glass Navigation -->
      <nav class="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-30 pointer-events-auto">
        <div class="max-w-xs mx-auto h-14 rounded-full glass-dock shadow-dock flex items-center justify-around px-2">
          
          <!-- Map Tab -->
          <button 
            id="nav-btn-map" 
            class="flex items-center gap-1.5 px-4 py-2 rounded-full text-text-secondary hover:text-text-primary text-xs font-bold transition-all"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>Mapa</span>
          </button>

          <!-- Chat Tab (Active) -->
          <button class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-primary text-brand-on-primary text-xs font-bold shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Chat</span>
          </button>

          <!-- Settings Tab -->
          <button 
            id="nav-btn-profile" 
            class="flex items-center gap-1.5 px-4 py-2 rounded-full text-text-secondary hover:text-text-primary text-xs font-bold transition-all"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Perfil</span>
          </button>

        </div>
      </nav>

    </div>
  `;

  const messagesContainer = container.querySelector('#chat-messages-container') as HTMLElement;
  const form = container.querySelector('#chat-composer-form') as HTMLFormElement;
  const inputEl = container.querySelector('#chat-input-text') as HTMLInputElement;
  const sendBtn = container.querySelector('#chat-btn-send') as HTMLButtonElement;

  function renderChatHeader(): void {
    const slot = container.querySelector('#chat-header-group-slot');
    if (!slot) return;

    if (accessibleGroups.length <= 1) {
      const gname = accessibleGroups[0]?.name || 'Familia';
      slot.innerHTML = `
        <h1 class="text-sm font-bold text-text-primary flex items-center gap-2">
          Chat: ${escapeHtml(gname)}
          <span class="w-2 h-2 rounded-full bg-status-online"></span>
        </h1>
        <p class="text-[11px] text-text-secondary">Mensajería instantánea de grupo</p>
      `;
      return;
    }

    slot.innerHTML = `
      <div class="flex flex-col">
        <div class="flex items-center gap-1.5">
          <label for="chat-group-select" class="text-[10px] uppercase font-bold text-text-secondary">Grupo:</label>
          <select 
            id="chat-group-select" 
            class="glass-panel text-xs font-bold text-text-primary px-2.5 py-1 rounded-full border border-surface-glass-border shadow-xs focus:outline-none cursor-pointer"
          >
            ${accessibleGroups
              .map(
                (g) => `
              <option value="${g.id}" ${g.id === activeGroupId ? 'selected' : ''}>
                ${escapeHtml(g.name)}
              </option>
            `
              )
              .join('')}
          </select>
          <span class="w-2 h-2 rounded-full bg-status-online"></span>
        </div>
        <p class="text-[10px] text-text-secondary mt-0.5">Mensajería instantánea de grupo</p>
      </div>
    `;

    slot.querySelector('#chat-group-select')?.addEventListener('change', (e) => {
      const newGroupId = (e.target as HTMLSelectElement).value;
      if (newGroupId !== activeGroupId) {
        activeGroupId = newGroupId;
        triggerHaptic('light');
        subscribeToCurrentChatGroup();
      }
    });
  }

  function subscribeToCurrentChatGroup(): void {
    if (chatUnsubscribe) {
      chatUnsubscribe();
      chatUnsubscribe = null;
    }

    const currentSubGroupId = activeGroupId;
    const cached = chatService.getCachedMessages(activeGroupId);

    // Stale-While-Revalidate: Si ya tenemos mensajes en caché para este grupo,
    // renderizamos instantáneamente (0ms) sin parpadeo ni pantalla de carga
    if (cached && cached.length > 0) {
      renderMessagesList(messagesContainer, cached, currentUser.uid);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } else {
      messagesContainer.innerHTML = `
        <div class="my-auto text-center p-6 text-text-disabled text-xs">
          <div class="w-8 h-8 mx-auto mb-2 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center animate-pulse">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          Cargando mensajes del canal...
        </div>
      `;
    }

    chatUnsubscribe = chatService.subscribeToRecentMessages(
      (messages) => {
        if (activeGroupId !== currentSubGroupId) return;
        renderMessagesList(messagesContainer, messages, currentUser.uid);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      },
      50,
      (err) => {
        if (activeGroupId !== currentSubGroupId) return;
        // Solo mostrar error visual si no hay mensajes en caché renderizados
        if (!chatService.getCachedMessages(activeGroupId)?.length) {
          messagesContainer.innerHTML = `
            <div class="my-auto text-center p-6 text-status-error text-xs">
              No se pudieron cargar los mensajes: ${escapeHtml(err.message)}
            </div>
          `;
        }
      },
      activeGroupId || undefined
    );
  }

  // Suscribirse a grupos si está provisto el servicio
  if (groupService) {
    groupsUnsubscribe = groupService.subscribeToGroups((groupsList) => {
      const effectiveProfile: UserProfile = userProfile || {
        uid: currentUser.uid,
        email: '',
        display_name: currentUser.name,
        role: 'member',
        status: 'active',
        groupIds: [],
      };
      accessibleGroups = groupService.getUserGroups(
        effectiveProfile,
        groupsList
      );

      if (!activeGroupId && accessibleGroups.length > 0) {
        activeGroupId = accessibleGroups[0].id;
      }
      renderChatHeader();
      subscribeToCurrentChatGroup();

      // Precarga en segundo plano de los demás grupos para cambio instantáneo
      accessibleGroups.forEach((g) => {
        if (g.id !== activeGroupId) {
          chatService.preloadGroupMessages(g.id).catch(() => {});
        }
      });
    });
  } else {
    subscribeToCurrentChatGroup();
  }

  // Manejar envío de mensaje
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text || isSending) return;

    isSending = true;
    sendBtn.disabled = true;

    try {
      await chatService.sendMessage(currentUser, text, activeGroupId || undefined);
      triggerHaptic('success');
      inputEl.value = '';
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al enviar el mensaje');
    } finally {
      isSending = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  });

  // Eventos de navegación
  container.querySelector('#nav-btn-map')?.addEventListener('click', () => {
    triggerHaptic('light');
    onNavigateTab('map');
  });

  container.querySelector('#nav-btn-profile')?.addEventListener('click', () => {
    triggerHaptic('light');
    onNavigateTab('profile');
  });

  // Retornar función de limpieza
  return () => {
    if (chatUnsubscribe) {
      chatUnsubscribe();
      chatUnsubscribe = null;
    }
    if (groupsUnsubscribe) {
      groupsUnsubscribe();
      groupsUnsubscribe = null;
    }
  };
}

function renderMessagesList(
  container: HTMLElement,
  messages: ChatMessage[],
  currentUserId: string
): void {
  if (messages.length === 0) {
    container.innerHTML = `
      <div class="my-auto text-center p-6 text-text-secondary text-xs">
        <div class="w-12 h-12 mx-auto mb-2 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </div>
        <p class="font-bold text-text-primary">El chat está en silencio</p>
        <p class="text-[11px] text-text-disabled mt-1">Escribe el primer mensaje para este grupo.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = messages
    .map((msg) => {
      const isMe = msg.sender_id === currentUserId;
      const timeStr = formatTime(msg.created_at);

      if (isMe) {
        return `
          <div class="flex flex-col items-end gap-1">
            <div class="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-xs bg-brand-primary text-brand-on-primary text-sm shadow-sm break-words leading-relaxed font-sans">
              ${escapeHtml(msg.text)}
            </div>
            <span class="text-[10px] text-text-disabled pr-1 font-mono">${timeStr}</span>
          </div>
        `;
      }

      const initial = (msg.sender_name || 'F')[0].toUpperCase();

      return `
        <div class="flex items-start gap-2.5">
          <div class="w-8 h-8 rounded-full shrink-0 bg-surface-card border border-border-subtle flex items-center justify-center text-xs font-bold text-brand-primary overflow-hidden shadow-xs mt-0.5">
            ${
              msg.sender_photo
                ? `<img src="${msg.sender_photo}" alt="${escapeHtml(msg.sender_name)}" class="w-full h-full object-cover" />`
                : initial
            }
          </div>
          <div class="flex flex-col items-start gap-1 max-w-[80%]">
            <span class="text-[11px] font-bold text-text-secondary pl-1">${escapeHtml(msg.sender_name)}</span>
            <div class="px-4 py-2.5 rounded-2xl rounded-bl-xs glass-panel text-text-primary text-sm shadow-xs break-words leading-relaxed font-sans">
              ${escapeHtml(msg.text)}
            </div>
            <span class="text-[10px] text-text-disabled pl-1 font-mono">${timeStr}</span>
          </div>
        </div>
      `;
    })
    .join('');
}

function formatTime(timestampMs: number): string {
  if (!timestampMs) return '';
  const date = new Date(timestampMs);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
