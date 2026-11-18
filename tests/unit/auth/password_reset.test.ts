import { describe, it, expect, vi } from 'vitest';
import { FamilyAuthService } from '@/auth/auth_service';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  deleteUser: vi.fn().mockResolvedValue(undefined),
  sendEmailVerification: vi.fn().mockResolvedValue(undefined),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, col, id) => ({ col, id })),
  getDoc: vi.fn(async () => ({
    exists: () => false,
    data: () => undefined,
  })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => 123456),
}));

describe('FamilyAuthService - Password Reset', () => {
  const mockAuth = {} as Auth;
  const mockDb = {} as Firestore;

  it('llama a sendPasswordResetEmail con el email normalizado', async () => {
    const authService = new FamilyAuthService(mockAuth, mockDb);
    const { sendPasswordResetEmail } = await import('firebase/auth');

    await authService.sendPasswordReset('  Familiar@Correo.com  ');

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(mockAuth, 'familiar@correo.com');
  });

  it('lanza un error si el correo está vacío', async () => {
    const authService = new FamilyAuthService(mockAuth, mockDb);

    await expect(authService.sendPasswordReset('   ')).rejects.toThrow(
      'Por favor, introduce un correo electrónico válido.'
    );
  });

  it('elimina el usuario de Firebase Authentication si fue purgado de Firestore al intentar iniciar sesión (BR-AUTH-03)', async () => {
    const authService = new FamilyAuthService(mockAuth, mockDb);
    const { signInWithEmailAndPassword, deleteUser } = await import('firebase/auth');
    const mockPurgedUser = { uid: 'purged-uid', email: 'ex@familia.es' };
    vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce({
      user: mockPurgedUser,
    } as never);

    await expect(authService.login('ex@familia.es', 'password123')).rejects.toThrow(
      'Tu cuenta ha sido eliminada por el administrador.'
    );

    expect(deleteUser).toHaveBeenCalledWith(mockPurgedUser);
  });
});
