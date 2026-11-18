import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { AuthSession, UserProfile } from './types';
import { normalizeEmail } from './whitelist';
import { isUserApproved } from './gatekeeper';

export class FamilyAuthService {
  private registeringInProgress = false;

  constructor(
    private readonly auth: Auth,
    private readonly db: Firestore
  ) {}

  isRegisteringInProgress(): boolean {
    return this.registeringInProgress;
  }

  /**
   * Elimina el registro del usuario actual en Firebase Authentication (BR-AUTH-03).
   * Si el token requiere reautenticación reciente, cierra la sesión inmediatamente
   * para que el borrado definitivo en Authentication ocurra en su próximo login/registro.
   */
  async purgeCurrentUserAuth(user: User): Promise<void> {
    try {
      await deleteUser(user);
    } catch {
      await signOut(this.auth);
    }
  }

  async register(
    rawEmail: string,
    pass: string,
    displayName: string
  ): Promise<AuthSession> {
    const email = normalizeEmail(rawEmail);
    const name = displayName.trim();

    if (pass.length < 8) {
      throw new Error('La contraseña debe tener un mínimo de 8 caracteres.');
    }
    if (!name) {
      throw new Error('Por favor, introduce tu nombre completo.');
    }

    this.registeringInProgress = true;
    try {
      // 1. Crear credencial en Firebase Auth (si existía una credencial huérfana purgada en Firestore, limpiarla primero)
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(this.auth, email, pass);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code === 'auth/email-already-in-use') {
          const existingCred = await signInWithEmailAndPassword(this.auth, email, pass);
          const existingProfile = await this.fetchUserProfile(existingCred.user.uid);
          if (!existingProfile) {
            await deleteUser(existingCred.user);
            userCredential = await createUserWithEmailAndPassword(this.auth, email, pass);
          } else {
            await signOut(this.auth);
            throw err;
          }
        } else {
          throw err;
        }
      }

      const user = userCredential.user;

      // Actualizar nombre visible en el objeto Auth
      await updateProfile(user, { displayName: name });

      // 2. Enviar correo de verificación nativo
      await sendEmailVerification(user);

      // 3. Crear documento de usuario con status 'unverified_email'
      const userDocRef = doc(this.db, 'users', user.uid);
      const profile: UserProfile = {
        uid: user.uid,
        email,
        display_name: name,
        role: 'member',
        status: 'unverified_email',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      await setDoc(userDocRef, profile);

      return {
        user: profile,
        isApproved: false,
      };
    } finally {
      this.registeringInProgress = false;
    }
  }

  async checkEmailVerifiedAndPromote(user: User): Promise<boolean> {
    await user.reload();
    if (user.emailVerified) {
      const userDocRef = doc(this.db, 'users', user.uid);
      await updateDoc(userDocRef, {
        status: 'pending_approval',
        updated_at: serverTimestamp(),
      });
      return true;
    }
    return false;
  }

  async resendVerificationEmail(user: User): Promise<void> {
    await sendEmailVerification(user);
  }

  async login(rawEmail: string, pass: string): Promise<AuthSession> {
    const email = normalizeEmail(rawEmail);
    const userCredential = await signInWithEmailAndPassword(this.auth, email, pass);
    const uid = userCredential.user.uid;

    const profile = await this.fetchUserProfile(uid);
    if (!profile) {
      await this.purgeCurrentUserAuth(userCredential.user);
      throw new Error('Tu cuenta ha sido eliminada por el administrador.');
    }

    return {
      user: profile,
      isApproved: isUserApproved(profile),
    };
  }

  async fetchUserProfile(uid: string): Promise<UserProfile | null> {
    const userSnap = await getDoc(doc(this.db, 'users', uid));
    if (!userSnap.exists()) {
      return null;
    }
    return userSnap.data() as UserProfile;
  }

  subscribeToUserProfile(
    uid: string,
    onProfile: (profile: UserProfile | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const userDocRef = doc(this.db, 'users', uid);
    return onSnapshot(
      userDocRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onProfile(null);
          return;
        }
        onProfile(snapshot.data() as UserProfile);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  async sendPasswordReset(rawEmail: string): Promise<void> {
    const email = normalizeEmail(rawEmail);
    if (!email) {
      throw new Error('Por favor, introduce un correo electrónico válido.');
    }
    await sendPasswordResetEmail(this.auth, email);
  }
}

