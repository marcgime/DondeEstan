import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FamilyChatService, MAX_MESSAGE_LENGTH } from '../../../src/chat/chat_service';
import type { Firestore } from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(() => ({ type: 'collection-ref' })),
    addDoc: vi.fn(async () => ({ id: 'msg-mock-123' })),
    query: vi.fn((...args) => ({ type: 'query-ref', args })),
    orderBy: vi.fn((field, dir) => ({ type: 'order-by', field, dir })),
    limit: vi.fn((n) => ({ type: 'limit', n })),
    getDocs: vi.fn(async () => ({
      docs: [
        {
          id: 'msg-preload-2',
          data: () => ({
            sender_id: 'user-preload',
            sender_name: 'David',
            text: 'Mensaje precargado reciente',
            created_at: 200,
          }),
        },
        {
          id: 'msg-preload-1',
          data: () => ({
            sender_id: 'user-preload',
            sender_name: 'David',
            text: 'Mensaje precargado antiguo',
            created_at: 100,
          }),
        },
      ],
    })),
    onSnapshot: vi.fn((_q, callback) => {
      // Simular entrega de snapshots invertidos
      callback({
        docs: [
          {
            id: 'msg-2',
            data: () => ({
              sender_id: 'user-2',
              sender_name: 'Elena',
              text: 'Hola familia',
              created_at: 200,
            }),
          },
          {
            id: 'msg-1',
            data: () => ({
              sender_id: 'user-1',
              sender_name: 'Marc',
              text: 'Buenas tardes',
              created_at: 100,
            }),
          },
        ],
      });
      return vi.fn(); // unsubscribe mock
    }),
  };
});

describe('FamilyChatService', () => {
  let mockDb: Firestore;
  let service: FamilyChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {} as unknown as Firestore;
    service = new FamilyChatService(mockDb);
  });

  describe('sendMessage', () => {
    it('debe rechazar mensajes vacíos o con solo espacios en blanco', async () => {
      const sender = { uid: 'u1', name: 'Marc' };
      await expect(service.sendMessage(sender, '')).rejects.toThrow(
        'El mensaje no puede estar vacío.'
      );
      await expect(service.sendMessage(sender, '    ')).rejects.toThrow(
        'El mensaje no puede estar vacío.'
      );
    });

    it('debe rechazar mensajes que superen la longitud máxima de 500 caracteres', async () => {
      const sender = { uid: 'u1', name: 'Marc' };
      const longText = 'a'.repeat(MAX_MESSAGE_LENGTH + 1);
      await expect(service.sendMessage(sender, longText)).rejects.toThrow(
        `El mensaje supera el límite de ${MAX_MESSAGE_LENGTH} caracteres.`
      );
    });

    it('debe enviar un mensaje válido recortando espacios sobrantes', async () => {
      const sender = { uid: 'u1', name: 'Marc', photoUrl: 'https://avatar.png' };
      const id = await service.sendMessage(sender, '  Hola a todos  ');
      expect(id).toBe('msg-mock-123');
    });
  });

  describe('subscribeToRecentMessages', () => {
    it('debe invertir el orden de los mensajes recibidos para mostrarlos cronológicamente (antiguos primero)', () => {
      const callback = vi.fn();
      const unsubscribe = service.subscribeToRecentMessages(callback, 50);

      expect(callback).toHaveBeenCalledWith([
        {
          id: 'msg-1',
          sender_id: 'user-1',
          sender_name: 'Marc',
          sender_photo: undefined,
          text: 'Buenas tardes',
          created_at: 100,
        },
        {
          id: 'msg-2',
          sender_id: 'user-2',
          sender_name: 'Elena',
          sender_photo: undefined,
          text: 'Hola familia',
          created_at: 200,
        },
      ]);

      expect(typeof unsubscribe).toBe('function');
    });

    it('debe entregar los mensajes de la caché inmediatamente si ya existen en memoria', () => {
      const callback1 = vi.fn();
      service.subscribeToRecentMessages(callback1, 50, undefined, 'grupo-a');

      // Ahora la caché tiene los mensajes del grupo-a
      expect(service.getCachedMessages('grupo-a')?.length).toBe(2);

      const callback2 = vi.fn();
      service.subscribeToRecentMessages(callback2, 50, undefined, 'grupo-a');

      // callback2 debe ser invocado de inmediato con los mensajes en caché (Stale-While-Revalidate)
      expect(callback2).toHaveBeenCalledWith([
        {
          id: 'msg-1',
          sender_id: 'user-1',
          sender_name: 'Marc',
          sender_photo: undefined,
          text: 'Buenas tardes',
          created_at: 100,
        },
        {
          id: 'msg-2',
          sender_id: 'user-2',
          sender_name: 'Elena',
          sender_photo: undefined,
          text: 'Hola familia',
          created_at: 200,
        },
      ]);
    });
  });

  describe('In-Memory Caching & Preloading', () => {
    it('debe precargar mensajes de grupo y guardarlos en memoria caché', async () => {
      expect(service.getCachedMessages('grupo-b')).toBeUndefined();

      const messages = await service.preloadGroupMessages('grupo-b');
      expect(messages.length).toBe(2);
      expect(messages[0].id).toBe('msg-preload-1');
      expect(messages[1].id).toBe('msg-preload-2');

      const cached = service.getCachedMessages('grupo-b');
      expect(cached).toEqual(messages);

      // Si se vuelve a precargar, devuelve la caché existente
      const cachedSecond = await service.preloadGroupMessages('grupo-b');
      expect(cachedSecond).toBe(cached);
    });

    it('debe limpiar la memoria caché correctamente con clearCache', async () => {
      await service.preloadGroupMessages('grupo-c');
      expect(service.getCachedMessages('grupo-c')?.length).toBe(2);

      service.clearCache();
      expect(service.getCachedMessages('grupo-c')).toBeUndefined();
    });
  });
});
