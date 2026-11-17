import { describe, it, expect, vi } from 'vitest';
import { FamilyAuthService } from '@/auth/auth_service';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
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
});
