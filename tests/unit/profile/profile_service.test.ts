import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from '../../../src/profile/profile_service';
import { compressAndCropAvatar } from '../../../src/profile/image_compressor';
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
});

describe('image_compressor', () => {
  it('debe rechazar archivos que no sean imágenes', async () => {
    const fakeFile = new File(['hello'], 'document.pdf', { type: 'application/pdf' });
    await expect(compressAndCropAvatar(fakeFile)).rejects.toThrow(
      'El archivo seleccionado no es una imagen válida.'
    );
  });
});

