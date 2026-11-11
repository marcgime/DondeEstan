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
  });
});
