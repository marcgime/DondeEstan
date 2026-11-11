import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { AuthSession, UserProfile } from './types';
import { normalizeEmail, verifyEmailEligibility } from './whitelist';
import { isUserApproved } from './gatekeeper';

export class FamilyAuthService {
  constructor(
    private readonly auth: Auth,
    private readonly db: Firestore
  ) {}

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

    // 1. Validar elegibilidad contra whitelist y config
    const eligibility = await verifyEmailEligibility(this.db, email);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || 'Correo no autorizado para registro.');
    }

    // 2. Crear credencial en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, pass);
    const user = userCredential.user;

    // Actualizar nombre visible en el objeto Auth
    await updateProfile(user, { displayName: name });

    // 3. Batch atómico: /users/{uid} en pending_approval y actualización de /whitelist/{email}
    const batch = writeBatch(this.db);

    const userDocRef = doc(this.db, 'users', user.uid);
    const profile: UserProfile = {
      uid: user.uid,
      email,
      display_name: name,
      role: 'member',
      status: 'pending_approval',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };
    batch.set(userDocRef, profile);

    const whitelistDocRef = doc(this.db, 'whitelist', email);
    batch.update(whitelistDocRef, {
      status: 'pending_approval',
      uid: user.uid,
      registered_at: serverTimestamp(),
    });

    await batch.commit();

    return {
      user: profile,
      isApproved: false,
    };
  }

  async login(rawEmail: string, pass: string): Promise<AuthSession> {
    const email = normalizeEmail(rawEmail);
    const userCredential = await signInWithEmailAndPassword(this.auth, email, pass);
    const uid = userCredential.user.uid;

    const profile = await this.fetchUserProfile(uid);
    if (!profile) {
      throw new Error('El perfil de usuario familiar no fue encontrado en el sistema.');
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
}

