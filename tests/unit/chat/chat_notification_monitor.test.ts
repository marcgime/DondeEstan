import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Firestore } from 'firebase/firestore';
import {
  ChatNotificationMonitor,
  isChatNotificationsEnabled,
  setStoredChatNotificationsEnabled,
} from '../../../src/chat/chat_notification_monitor';
import {
  getGlobalChatUnreadCount,
  setGlobalChatUnreadCount,
} from '../../../src/ui/components/FloatingTabBar';
import type { Group, GroupService } from '../../../src/admin';
import type { UserProfile } from '../../../src/auth/types';

type SnapshotCallback = (snap: {
  docs: Array<{ id: string; data: () => Record<string, unknown> }>;
}) => void;

const snapshotCallbacksByPath = new Map<string, SnapshotCallback>();
const unsubscribeSpiesByPath = new Map<string, ReturnType<typeof vi.fn>>();

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, ...parts: string[]) => ({
      path: parts.join('/'),
    })),
    query: vi.fn((colRef: { path: string }) => ({
      path: colRef.path,
    })),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn((q: { path: string }, onNext: SnapshotCallback) => {
      snapshotCallbacksByPath.set(q.path, onNext);
      const spy = vi.fn();
      unsubscribeSpiesByPath.set(q.path, spy);
      return spy;
    }),
  };
});

describe('ChatNotificationMonitor & Notificaciones por Grupo (BR-CHAT-04)', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    snapshotCallbacksByPath.clear();
    unsubscribeSpiesByPath.clear();
    setGlobalChatUnreadCount(0);
    Object.keys(store).forEach((k) => delete store[k]);

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('evalúa correctamente si las notificaciones están activadas en el perfil o localStorage', () => {
    expect(isChatNotificationsEnabled(null)).toBe(true);
    setStoredChatNotificationsEnabled(false);
    expect(isChatNotificationsEnabled(null)).toBe(false);

    const profileEnabled: UserProfile = {
      uid: 'u1',
      email: 'u1@test.com',
      display_name: 'Marc',
      role: 'member',
      status: 'active',
      chat_notifications_enabled: true,
    };
    expect(isChatNotificationsEnabled(profileEnabled)).toBe(true);

    const profileDisabled: UserProfile = {
      ...profileEnabled,
      chat_notifications_enabled: false,
    };
    expect(isChatNotificationsEnabled(profileDisabled)).toBe(false);
  });

  it('solo escucha los grupos del usuario, ignora mensajes propios/iniciales e incrementa el globo rojo solo con mensajes nuevos de compañeros', () => {
    const currentUser: UserProfile = {
      uid: 'user-1',
      email: 'u1@test.com',
      display_name: 'Marc',
      role: 'member',
      status: 'active',
      groupIds: ['grp-familia'],
      chat_notifications_enabled: true,
    };

    const allGroups: Group[] = [
      { id: 'grp-familia', name: 'Familia', created_at: 1, created_by: 'admin' },
      { id: 'grp-ajeno', name: 'Ajeno', created_at: 2, created_by: 'admin' },
    ];

    const groupsUnsubSpy = vi.fn();
    const mockGroupService = {
      subscribeToGroups: vi.fn((cb: (groups: Group[]) => void) => {
        cb(allGroups);
        return groupsUnsubSpy;
      }),
      getUserGroups: vi.fn((user: UserProfile, groups: Group[]) =>
        groups.filter((g) => (user.groupIds || []).includes(g.id))
      ),
    } as unknown as GroupService;

    let currentTab: 'map' | 'chat' | 'profile' = 'map';
    const monitor = new ChatNotificationMonitor({
      db: {} as Firestore,
      groupService: mockGroupService,
      getCurrentUser: () => currentUser,
      getCurrentTab: () => currentTab,
      onOpenChatTab: () => {
        currentTab = 'chat';
      },
    });

    monitor.start();

    // Solo debe haberse suscrito a grp-familia y NO a grp-ajeno
    expect(snapshotCallbacksByPath.has('groups/grp-familia/messages')).toBe(true);
    expect(snapshotCallbacksByPath.has('groups/grp-ajeno/messages')).toBe(false);

    const emitFamilia = snapshotCallbacksByPath.get('groups/grp-familia/messages')!;

    // 1. Snapshot inicial (histórico): no debe incrementar el contador de no leídos
    emitFamilia({
      docs: [
        {
          id: 'msg-old-1',
          data: () => ({
            sender_id: 'user-2',
            sender_name: 'Ana',
            text: 'Mensaje antiguo',
            created_at: 1000,
          }),
        },
      ],
    });
    expect(getGlobalChatUnreadCount()).toBe(0);

    // 2. Mensaje nuevo enviado por el PROPIO usuario: no debe incrementar no leídos
    emitFamilia({
      docs: [
        {
          id: 'msg-self-2',
          data: () => ({
            sender_id: 'user-1',
            sender_name: 'Marc',
            text: 'Mi propio mensaje',
            created_at: 2000,
          }),
        },
        {
          id: 'msg-old-1',
          data: () => ({
            sender_id: 'user-2',
            sender_name: 'Ana',
            text: 'Mensaje antiguo',
            created_at: 1000,
          }),
        },
      ],
    });
    expect(getGlobalChatUnreadCount()).toBe(0);

    // 3. Mensaje nuevo de un compañero de grupo estando en Mapa: incrementa globo rojo a 1
    emitFamilia({
      docs: [
        {
          id: 'msg-peer-3',
          data: () => ({
            sender_id: 'user-2',
            sender_name: 'Ana',
            text: '¡Hola equipo!',
            created_at: 3000,
          }),
        },
        {
          id: 'msg-self-2',
          data: () => ({
            sender_id: 'user-1',
            sender_name: 'Marc',
            text: 'Mi propio mensaje',
            created_at: 2000,
          }),
        },
      ],
    });
    expect(getGlobalChatUnreadCount()).toBe(1);

    // 4. Otro mensaje nuevo de compañero: incrementa globo rojo a 2
    emitFamilia({
      docs: [
        {
          id: 'msg-peer-4',
          data: () => ({
            sender_id: 'user-3',
            sender_name: 'Carlos',
            text: 'Ya llego',
            created_at: 4000,
          }),
        },
        {
          id: 'msg-peer-3',
          data: () => ({
            sender_id: 'user-2',
            sender_name: 'Ana',
            text: '¡Hola equipo!',
            created_at: 3000,
          }),
        },
      ],
    });
    expect(getGlobalChatUnreadCount()).toBe(2);

    // 5. Al entrar al menú de Chat (markAllAsRead), desaparece el globo rojo (contador = 0)
    monitor.markAllAsRead();
    expect(getGlobalChatUnreadCount()).toBe(0);

    // 6. Al detener el monitor, limpia todas las suscripciones (FM-002)
    monitor.stop();
    expect(groupsUnsubSpy).toHaveBeenCalledTimes(1);
    expect(unsubscribeSpiesByPath.get('groups/grp-familia/messages')).toHaveBeenCalledTimes(1);
  });
});
