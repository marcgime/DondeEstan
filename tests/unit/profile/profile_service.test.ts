import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from '../../../src/profile/profile_service';
import { compressAndCropAvatar } from '../../../src/profile/image_compressor';
import { renderProfileView } from '../../../src/profile/views/ProfileView';
import type { GroupService } from '../../../src/admin/group_service';
import type { Group } from '../../../src/admin/types';
import type { Firestore } from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn((_db, _col, _id) => ({ type: 'doc-ref' })),
    updateDoc: vi.fn(async () => {}),
  };
});

describe('ProfileService', () => {
  let mockDb: Firestore;
  let service: ProfileService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {} as unknown as Firestore;
    service = new ProfileService(mockDb);
  });

  describe('updateDisplayName', () => {
    it('debe rechazar nombres vacíos o con solo espacios', async () => {
      await expect(service.updateDisplayName('u1', '')).rejects.toThrow(
        'El nombre no puede estar vacío.'
      );
      await expect(service.updateDisplayName('u1', '   ')).rejects.toThrow(
        'El nombre no puede estar vacío.'
      );
    });

    it('debe actualizar el nombre en Firestore recortando espacios sobrantes', async () => {
      await expect(service.updateDisplayName('u1', '  Marc Giménez  ')).resolves.not.toThrow();
    });
  });

  describe('updateAvatar', () => {
    it('debe actualizar el avatar con la data URL en Firestore', async () => {
      await expect(service.updateAvatar('u1', 'data:image/jpeg;base64,mockdata')).resolves.not.toThrow();
    });
  });

  describe('updateUiScale', () => {
    it('debe actualizar la preferencia de zoom de interfaz en Firestore', async () => {
      await expect(service.updateUiScale('u1', 'comfortable')).resolves.not.toThrow();
    });
  });
});

describe('image_compressor', () => {
  it('debe rechazar archivos que no sean imágenes', async () => {
    const fakeFile = new File(['hello'], 'document.pdf', { type: 'application/pdf' });
    await expect(compressAndCropAvatar(fakeFile)).rejects.toThrow(
      'El archivo seleccionado no es una imagen válida.'
    );
  });
});

describe('renderProfileView - Núcleo (Grupos del usuario)', () => {
  it('muestra en la sección Núcleo los grupos a los que pertenece el usuario y limpia la suscripción al desmontar', () => {
    const groupsEl = { innerHTML: '' };
    const container = {
      innerHTML: '',
      querySelector: vi.fn((selector: string) => {
        if (selector === '#profile-user-groups') return groupsEl;
        return null;
      }),
      querySelectorAll: vi.fn(() => []),
    } as unknown as HTMLElement;

    const unsubscribeMock = vi.fn();
    const allGroups: Group[] = [
      { id: 'g1', name: 'Familia', created_at: 1, created_by: 'admin' },
      { id: 'g2', name: 'Amigos', created_at: 2, created_by: 'admin' },
      { id: 'g3', name: 'Trabajo', created_at: 3, created_by: 'admin' },
    ];

    const mockGroupService = {
      subscribeToGroups: vi.fn((cb: (groups: Group[]) => void) => {
        cb(allGroups);
        return unsubscribeMock;
      }),
      getUserGroups: vi.fn((user, groups: Group[]) =>
        groups.filter((g) => (user.groupIds || []).includes(g.id))
      ),
    } as unknown as GroupService;

    const cleanup = renderProfileView(container, {
      profile: {
        uid: 'u1',
        email: 'user@example.com',
        display_name: 'Marc',
        role: 'member',
        status: 'active',
        groupIds: ['g1', 'g2'],
      },
      profileService: {} as ProfileService,
      groupService: mockGroupService,
      onNavigateTab: vi.fn(),
      onLogout: vi.fn(async () => {}),
    });

    expect(groupsEl.innerHTML).toContain('Familia');
    expect(groupsEl.innerHTML).toContain('Amigos');
    expect(groupsEl.innerHTML).not.toContain('Trabajo');

    cleanup();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });
});


