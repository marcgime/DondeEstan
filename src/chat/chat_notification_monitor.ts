import {
  collection,
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Group, GroupService } from '../admin';
import type { UserProfile } from '../auth/types';
import { getFirebaseServices } from '../core/firebase';
import {
  updateAppBadge,
  clearAppBadge,
  subscribeToWebPush,
  unsubscribeFromWebPush,
} from '../core/pwa';
import type { WebPushSubscriptionRecord } from '../core/web_push';
import {
  getGlobalChatUnreadCount,
  setGlobalChatUnreadCount,
  type FloatingTabId,
} from '../ui/components/FloatingTabBar';
import { triggerHaptic } from '../ui/utils/haptics';

export const CHAT_NOTIFICATIONS_STORAGE_KEY = 'dondeestan_chat_notifications';

export function isChatNotificationsEnabled(profile?: UserProfile | null): boolean {
  if (profile && typeof profile.chat_notifications_enabled === 'boolean') {
    return profile.chat_notifications_enabled;
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(CHAT_NOTIFICATIONS_STORAGE_KEY);
      if (stored === 'false') return false;
      if (stored === 'true') return true;
    }
  } catch {
    // Ignorar errores de acceso a localStorage
  }
  return true;
}

export function setStoredChatNotificationsEnabled(enabled: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CHAT_NOTIFICATIONS_STORAGE_KEY, enabled ? 'true' : 'false');
    }
  } catch {
    // Ignorar errores de acceso a localStorage
  }
}

export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestChatNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}

export interface DeviceNotificationPayload {
  title: string;
  body: string;
  groupName: string;
  tag?: string;
  onClick?: () => void;
}

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderInAppChatToast(payload: DeviceNotificationPayload): void {
  if (typeof document === 'undefined') return;
  const host = document.getElementById('app') || document.body;
  if (!host) return;

  const existing = host.querySelector('#chat-live-toast');
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'chat-live-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.className =
    'fixed safe-toast-top inset-x-4 z-[10000] max-w-sm mx-auto p-3.5 rounded-2xl glass-dock shadow-alert border border-border-subtle flex items-center justify-between gap-3 cursor-pointer transition-all';

  toast.innerHTML = `
    <div class="flex items-center gap-3 min-w-0">
      <div class="w-9 h-9 rounded-full bg-brand-primary text-brand-on-primary flex items-center justify-center shrink-0 shadow-xs">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <div class="min-w-0 text-left">
        <p class="text-xs font-extrabold text-text-primary truncate">${escapeHtml(payload.title)}</p>
        <p class="text-[0.75rem] text-text-secondary truncate mt-0.5">${escapeHtml(payload.body)}</p>
      </div>
    </div>
    <span class="px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-[0.6875rem] font-bold shrink-0">
      Ver
    </span>
  `;

  const timeoutId = setTimeout(() => {
    toast.remove();
  }, 4500);

  toast.addEventListener('click', () => {
    clearTimeout(timeoutId);
    toast.remove();
    if (payload.onClick) {
      payload.onClick();
    }
  });

  host.appendChild(toast);
}

/**
 * Muestra una notificación en el dispositivo compatible con iOS (PWA/Safari), Android (PWA/Chrome) y Escritorio Web.
 */
export async function showDeviceChatNotification(
  payload: DeviceNotificationPayload
): Promise<boolean> {
  triggerHaptic('medium');

  // Mostrar siempre el aviso flotante in-app si la app está visible en otra pestaña
  if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
    renderInAppChatToast(payload);
  }

  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const notifOptions: NotificationOptions & { renotify?: boolean } = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/favicon.png',
    tag: payload.tag || 'dondeestan-chat',
    renotify: true,
    data: {
      tab: 'chat',
      url: '/',
    },
  };

  // 1. Vía preferente para Android Chrome e iOS 16.4+ PWA: ServiceWorkerRegistration.showNotification
  try {
    if ('serviceWorker' in navigator && typeof navigator.serviceWorker.getRegistration === 'function') {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(payload.title, notifOptions);
        return true;
      }
    }
  } catch {
    // Fallback a Notification de escritorio si falla el Service Worker
  }

  // 2. Fallback para navegadores de escritorio sin Service Worker activo
  try {
    const n = new Notification(payload.title, notifOptions);
    n.onclick = () => {
      try {
        window.focus();
      } catch {
        // Ignorar
      }
      if (payload.onClick) {
        payload.onClick();
      }
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}

/**
 * Sincroniza la suscripción Web Push del dispositivo actual en /users/{uid}.push_subscriptions
 * para recibir notificaciones en iOS/Android/Escritorio aunque la app esté cerrada o en reposo.
 */
export async function syncUserWebPushSubscription(
  db: Firestore,
  user: UserProfile
): Promise<boolean> {
  if (!user?.uid) return false;

  const enabled = isChatNotificationsEnabled(user);
  if (!enabled) {
    const removedEndpoint = await unsubscribeFromWebPush();
    if (removedEndpoint && Array.isArray(user.push_subscriptions)) {
      const filtered = user.push_subscriptions.filter((s) => s.endpoint !== removedEndpoint);
      if (filtered.length !== user.push_subscriptions.length) {
        await updateDoc(doc(db, 'users', user.uid), {
          push_subscriptions: filtered,
          updated_at: Date.now(),
        }).catch(() => {});
      }
    }
    return false;
  }

  if (getNotificationPermissionState() !== 'granted') {
    return false;
  }

  const sub = await subscribeToWebPush();
  if (!sub) return false;

  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    const existingRaw = snap.exists()
      ? (snap.data()?.push_subscriptions as WebPushSubscriptionRecord[] | undefined)
      : user.push_subscriptions;
    const existing = Array.isArray(existingRaw) ? existingRaw : [];

    const alreadyStored = existing.some(
      (s) =>
        s.endpoint === sub.endpoint &&
        s.keys?.p256dh === sub.keys.p256dh &&
        s.keys?.auth === sub.keys.auth
    );
    if (alreadyStored) return true;

    const updated = [...existing.filter((s) => s.endpoint !== sub.endpoint), sub].slice(-5);
    await updateDoc(userRef, {
      push_subscriptions: updated,
      updated_at: Date.now(),
    });
    return true;
  } catch (err) {
    console.warn('No se pudo guardar la suscripción Web Push:', err);
    return false;
  }
}

/**
 * Solicita al Worker de Cloudflare enviar una notificación Web Push a los compañeros
 * del grupo (funciona con móviles en reposo o pantalla bloqueada).
 */
export async function triggerRemoteGroupChatPush(
  groupId: string,
  senderName: string,
  text: string
): Promise<void> {
  if (!groupId || !text.trim() || typeof fetch === 'undefined') return;
  try {
    const { auth } = getFirebaseServices();
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return;

    await fetch('/api/chat/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        groupId,
        senderName,
        text,
      }),
    });
  } catch {
    // Silencioso: no interrumpir el envío del mensaje en Firestore
  }
}

export interface ChatNotificationMonitorOptions {
  db: Firestore;
  groupService: GroupService;
  getCurrentUser: () => UserProfile | null;
  getCurrentTab: () => FloatingTabId;
  onOpenChatTab: () => void;
}

/**
 * Monitoriza en tiempo real los mensajes entrantes únicamente de los grupos a los que
 * pertenece el usuario actual, actualizando el globo rojo de no leídos en el menú inferior
 * y disparando notificaciones en el dispositivo si están activadas en el perfil.
 */
export class ChatNotificationMonitor {
  private groupsUnsubscribe: Unsubscribe | null = null;
  private groupMessageUnsubscribes = new Map<string, Unsubscribe>();
  private knownMessageIdsByGroup = new Map<string, Set<string>>();
  private initialLoadedGroups = new Set<string>();

  constructor(private readonly options: ChatNotificationMonitorOptions) {}

  start(): void {
    this.stop();

    const user = this.options.getCurrentUser();
    if (!user) return;

    this.groupsUnsubscribe = this.options.groupService.subscribeToGroups((allGroups: Group[]) => {
      const latestUser = this.options.getCurrentUser();
      if (!latestUser) return;

      // Solo los grupos a los que pertenece el usuario (compañeros de grupo únicamente)
      const userGroups = this.options.groupService.getUserGroups(latestUser, allGroups);
      this.syncGroupListeners(userGroups);
    });
  }

  private syncGroupListeners(userGroups: Group[]): void {
    const activeGroupIds = new Set(userGroups.map((g) => g.id));

    // Desuscribir grupos a los que el usuario ya no pertenece (FM-002)
    for (const [groupId, unsub] of this.groupMessageUnsubscribes.entries()) {
      if (!activeGroupIds.has(groupId)) {
        unsub();
        this.groupMessageUnsubscribes.delete(groupId);
        this.knownMessageIdsByGroup.delete(groupId);
        this.initialLoadedGroups.delete(groupId);
      }
    }

    // Suscribir nuevos grupos del usuario
    for (const group of userGroups) {
      if (this.groupMessageUnsubscribes.has(group.id)) {
        continue;
      }

      const knownIds = new Set<string>();
      this.knownMessageIdsByGroup.set(group.id, knownIds);

      const chatCol = collection(this.options.db, 'groups', group.id, 'messages');
      const q = query(chatCol, orderBy('created_at', 'desc'), limit(5));

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const isInitial = !this.initialLoadedGroups.has(group.id);
          if (isInitial) {
            snapshot.docs.forEach((d) => knownIds.add(d.id));
            this.initialLoadedGroups.add(group.id);
            return;
          }

          const currentUser = this.options.getCurrentUser();
          if (!currentUser) return;

          // Procesar solo mensajes nuevos que no estaban antes
          const newDocs = snapshot.docs.filter((d) => !knownIds.has(d.id));
          if (newDocs.length === 0) return;

          newDocs.forEach((d) => knownIds.add(d.id));

          // Filtrar mensajes enviados por otros compañeros del grupo (ignorar los propios)
          const incomingFromPeers = newDocs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                sender_id: (data.sender_id as string) || '',
                sender_name: (data.sender_name as string) || 'Familiar',
                text: (data.text as string) || '',
                created_at: (data.created_at as number) || 0,
              };
            })
            .filter((m) => m.sender_id && m.sender_id !== currentUser.uid);

          if (incomingFromPeers.length === 0) return;

          const currentTab = this.options.getCurrentTab();
          const isDocumentHidden =
            typeof document !== 'undefined' && document.visibilityState === 'hidden';

          // Si el usuario NO está en el menú de chat, incrementar el globo rojo de mensajes nuevos
          if (currentTab !== 'chat') {
            const nextUnread = getGlobalChatUnreadCount() + incomingFromPeers.length;
            setGlobalChatUnreadCount(nextUnread);
            void updateAppBadge(nextUnread);
          }

          // Disparar notificación en el dispositivo si el usuario lo tiene habilitado en su perfil
          if (
            isChatNotificationsEnabled(currentUser) &&
            (currentTab !== 'chat' || isDocumentHidden)
          ) {
            const latestMsg = incomingFromPeers[0];
            void showDeviceChatNotification({
              title: `${latestMsg.sender_name} · ${group.name}`,
              body: latestMsg.text,
              groupName: group.name,
              tag: `chat-${group.id}`,
              onClick: () => {
                this.markAllAsRead();
                this.options.onOpenChatTab();
              },
            });
          }
        },
        (err) => {
          console.warn(`Error en monitor de notificaciones del grupo ${group.id}:`, err);
        }
      );

      this.groupMessageUnsubscribes.set(group.id, unsub);
    }
  }

  markAllAsRead(): void {
    setGlobalChatUnreadCount(0);
    void clearAppBadge();
    if (typeof document !== 'undefined') {
      document.getElementById('chat-live-toast')?.remove();
    }
  }

  stop(): void {
    if (this.groupsUnsubscribe) {
      this.groupsUnsubscribe();
      this.groupsUnsubscribe = null;
    }
    for (const unsub of this.groupMessageUnsubscribes.values()) {
      unsub();
    }
    this.groupMessageUnsubscribes.clear();
    this.knownMessageIdsByGroup.clear();
    this.initialLoadedGroups.clear();
  }
}
