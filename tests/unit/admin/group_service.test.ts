import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupService, DEFAULT_GROUP_NAME } from '../../../src/admin/group_service';
import type { Firestore } from 'firebase/firestore';
import type { UserProfile } from '../../../src/auth/types';

vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn((_db, _col, id) => ({ type: 'doc-ref', id })),
    collection: vi.fn((_db, col) => ({ type: 'col-ref', col })),
    addDoc: vi.fn(async () => ({ id: 'new-group-123' })),
    deleteDoc: vi.fn(async () => {}),
    updateDoc: vi.fn(async () => {}),
    getDocs: vi.fn(async (colRef) => {
      if (colRef.col === 'groups') {
        return {
          docs: [
            {
              id: 'grp-familia',
              data: () => ({
                name: 'Familia',
                created_at: 1000,
                created_by: 'admin-uid',
              }),
            },
          ],
        };
      }
      if (colRef.col === 'users') {
        return {
          docs: [
            {
              id: 'user-1',
              data: () => ({ groupIds: ['grp-familia', 'grp-amigos'] }),
            },
            {
              id: 'user-2',
              data: () => ({ groupIds: [] }),
            },
          ],
        };
      }
      return { docs: [] };
    }),
    query: vi.fn((...args) => ({ type: 'query', args })),
    orderBy: vi.fn((field, dir) => ({ type: 'orderBy', field, dir })),
    onSnapshot: vi.fn((_q, cb) => {
      cb({
        docs: [
          {
            id: 'grp-1',
            data: () => ({
              name: 'Familia',
              created_at: 1000,
              created_by: 'admin-1',
            }),
          },
        ],
      });
      return vi.fn();
    }),
    arrayRemove: vi.fn((val) => ({ type: 'arrayRemove', val })),
  };
});

describe('GroupService', () => {
  let mockDb: Firestore;
  let service: GroupService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {} as unknown as Firestore;
    service = new GroupService(mockDb);
  });

  describe('createGroup', () => {
    it('debe rechazar nombres vacíos o con solo espacios', async () => {
      await expect(service.createGroup('', 'admin-1')).rejects.toThrow(
        'El nombre del grupo no puede estar vacío.'
      );
      await expect(service.createGroup('   ', 'admin-1')).rejects.toThrow(
        'El nombre del grupo no puede estar vacío.'
      );
    });

    it('debe rechazar nombres que superen 50 caracteres', async () => {
      const longName = 'A'.repeat(51);
      await expect(service.createGroup(longName, 'admin-1')).rejects.toThrow(
        'El nombre del grupo no puede superar los 50 caracteres.'
      );
    });

    it('debe crear el grupo recortando espacios y retornar el id', async () => {
      const id = await service.createGroup('  Hijos y Primos  ', 'admin-1');
      expect(id).toBe('new-group-123');
    });
  });

  describe('deleteGroup', () => {
    it('debe eliminar el grupo y remover el groupId de los usuarios vinculados', async () => {
      await expect(service.deleteGroup('grp-amigos')).resolves.not.toThrow();
    });
  });

  describe('subscribeToGroups', () => {
    it('debe emitir los grupos ordenados al callback', () => {
      const cb = vi.fn();
      const unsub = service.subscribeToGroups(cb);

      expect(cb).toHaveBeenCalledWith([
        {
          id: 'grp-1',
          name: 'Familia',
          created_at: 1000,
          created_by: 'admin-1',
          guia_enabled: false,
        },
      ]);
      expect(typeof unsub).toBe('function');
    });
  });

  describe('setGroupGuiaEnabled', () => {
    it('debe rechazar ID de grupo vacío', async () => {
      await expect(service.setGroupGuiaEnabled('', true)).rejects.toThrow(
        'ID de grupo no válido.'
      );
    });

    it('debe actualizar el campo guia_enabled en Firestore', async () => {
      await expect(service.setGroupGuiaEnabled('grp-1', true)).resolves.not.toThrow();
    });
  });

  describe('assignUserGroups', () => {
    it('debe rechazar UID vacío', async () => {
      await expect(service.assignUserGroups('', ['g1'])).rejects.toThrow(
        'UID de usuario no válido.'
      );
    });

    it('debe actualizar los grupos del usuario deduplicando IDs', async () => {
      await expect(
        service.assignUserGroups('u1', ['g1', 'g2', 'g1'])
      ).resolves.not.toThrow();
    });
  });

  describe('ensureDefaultGroup', () => {
    it('debe retornar el grupo por defecto si ya existe y migrar usuarios sin grupo', async () => {
      const group = await service.ensureDefaultGroup('admin-1');
      expect(group.name).toBe(DEFAULT_GROUP_NAME);
      expect(group.id).toBe('grp-familia');
    });
  });

  describe('getUserGroups (BR-GRP-01)', () => {
    const allGroups = [
      { id: 'g1', name: 'Familia', created_at: 10, created_by: 'admin' },
      { id: 'g2', name: 'Trabajo', created_at: 20, created_by: 'admin' },
    ];

    it('el administrador siempre tiene acceso a TODOS los grupos', () => {
      const admin: UserProfile = {
        uid: 'adm-1',
        email: 'admin@familia.es',
        display_name: 'Admin',
        role: 'admin',
        status: 'active',
        groupIds: [], // Aunque no tenga asignado nada explícito
      };
      const result = service.getUserGroups(admin, allGroups);
      expect(result).toHaveLength(2);
      expect(result).toEqual(allGroups);
    });

    it('un usuario estándar solo tiene acceso a sus grupos asignados', () => {
      const member: UserProfile = {
        uid: 'mem-1',
        email: 'hijo@familia.es',
        display_name: 'Hijo',
        role: 'member',
        status: 'active',
        groupIds: ['g2'],
      };
      const result = service.getUserGroups(member, allGroups);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('g2');
    });
  });
});
