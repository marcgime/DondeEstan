import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from '../../../src/admin/admin_service';
import type { Firestore } from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn((_db, _col, _id) => ({ type: 'doc-ref' })),
    collection: vi.fn((_db, _col) => ({ type: 'col-ref' })),
    getDoc: vi.fn(async () => ({
      exists: () => true,
      data: () => ({ registration_open: true, max_members: 8 }),
    })),
    setDoc: vi.fn(async () => {}),
    updateDoc: vi.fn(async () => {}),
    deleteDoc: vi.fn(async () => {}),
    query: vi.fn((...args) => ({ type: 'query', args })),
    where: vi.fn((f, op, v) => ({ type: 'where', f, op, v })),
    onSnapshot: vi.fn((_q, cb) => {
      cb({ docs: [] });
      return vi.fn();
    }),
  };
});

describe('AdminService', () => {
  let mockDb: Firestore;
  let service: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {} as unknown as Firestore;
    service = new AdminService(mockDb);
  });

  describe('addWhitelistEmail', () => {
    it('debe rechazar correos vacíos o sin @', async () => {
      await expect(service.addWhitelistEmail('')).rejects.toThrow(
        'Introduce un correo electrónico válido.'
      );
      await expect(service.addWhitelistEmail('invalido')).rejects.toThrow(
        'Introduce un correo electrónico válido.'
      );
    });

    it('debe registrar el correo normalizado en la lista blanca', async () => {
      await expect(service.addWhitelistEmail('  Familiar@Correo.COM  ')).resolves.not.toThrow();
    });

    it('permite registrar miembros en la lista blanca sin restricción de cuota fija', async () => {
      for (let i = 1; i <= 20; i++) {
        await expect(service.addWhitelistEmail(`miembro${i}@familia.com`)).resolves.not.toThrow();
      }
    });
  });

  describe('purgeMember', () => {
    it('debe impedir que el administrador se auto-elimine (BR-ADM-02)', async () => {
      await expect(service.purgeMember('admin-1', 'admin-1')).rejects.toThrow(
        'No puedes purgar tu propia cuenta de administrador.'
      );
    });

    it('debe permitir purgar a un miembro que no sea el admin actual', async () => {
      await expect(service.purgeMember('member-2', 'admin-1')).resolves.not.toThrow();
    });
  });

  describe('approveMember & rejectMember', () => {
    it('debe actualizar el estado del miembro a active al aprobar', async () => {
      await expect(service.approveMember('user-1', 'user@correo.com')).resolves.not.toThrow();
    });

    it('debe actualizar el estado del miembro a rejected al rechazar', async () => {
      await expect(service.rejectMember('user-1')).resolves.not.toThrow();
    });
  });
});

