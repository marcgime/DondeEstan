import {
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseServices, isFirebaseConfigured } from '../core/firebase';
import type { SystemConfig } from './types';
import type { UserProfile } from '../auth/types';

export class AdminService {
  constructor(private readonly db: Firestore) {}

  /**
   * Conmuta el registro familiar global abierto/cerrado.
   */
  async setRegistrationOpen(isOpen: boolean): Promise<void> {
    const configRef = doc(this.db, 'config', 'system');
    await updateDoc(configRef, {
      registration_open: isOpen,
      updated_at: Date.now(),
    });
  }

  /**
   * Obtiene la configuración del sistema.
   */
  async getSystemConfig(): Promise<SystemConfig> {
    const configRef = doc(this.db, 'config', 'system');
    const snap = await getDoc(configRef);
    if (!snap.exists()) {
      return { registration_open: true, max_members: 8 };
    }
    const data = snap.data();
    return {
      registration_open: data.registration_open !== false,
      max_members: data.max_members || 8,
    };
  }

  /**
   * Suscribe en tiempo real a los usuarios en espera de validación.
   */
  subscribeToPendingMembers(
    onMembers: (members: UserProfile[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const usersCol = collection(this.db, 'users');
    const q = query(usersCol, where('status', '==', 'pending_approval'));

    return onSnapshot(
      q,
      (snapshot) => {
        const members: UserProfile[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            email: data.email || '',
            display_name: data.display_name || 'Familiar',
            role: data.role || 'member',
            status: data.status || 'pending_approval',
            photo_url: data.photo_url,
          };
        });
        onMembers(members);
      },
      (err) => {
        if (onError) onError(err);
        else console.error('Error escuchando miembros pendientes:', err);
      }
    );
  }

  /**
   * Aprueba a un miembro familiar, otorgándole acceso al mapa y chat.
   */
  async approveMember(uid: string): Promise<void> {
    const userRef = doc(this.db, 'users', uid);
    await updateDoc(userRef, {
      status: 'active',
      approved_at: Date.now(),
    });
  }

  /**
   * Rechaza la solicitud de un familiar.
   */
  async rejectMember(uid: string): Promise<void> {
    const userRef = doc(this.db, 'users', uid);
    await updateDoc(userRef, {
      status: 'rejected',
      rejected_at: Date.now(),
    });
  }

  /**
   * Añade un email preaprobado a la lista blanca.
   */
  async addWhitelistEmail(rawEmail: string, addedByUid?: string): Promise<void> {
    const email = rawEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      throw new Error('Introduce un correo electrónico válido.');
    }

    const whitelistRef = doc(this.db, 'whitelist', email);
    await setDoc(whitelistRef, {
      email,
      status: 'preapproved',
      added_at: Date.now(),
      uid: null,
      added_by: addedByUid || null,
    });
  }

  /**
   * Elimina un email de la lista blanca.
   */
  async removeWhitelistEmail(rawEmail: string): Promise<void> {
    const email = rawEmail.trim().toLowerCase();
    const whitelistRef = doc(this.db, 'whitelist', email);
    await deleteDoc(whitelistRef);
  }

  /**
   * Suscribe en tiempo real a todos los miembros familiares registrados (activos, online, offline).
   */
  subscribeToAllMembers(
    onMembers: (members: UserProfile[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const col = collection(this.db, 'users');
    return onSnapshot(
      col,
      (snapshot) => {
        const members: UserProfile[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            return {
              uid: d.id,
              email: data.email || '',
              display_name: data.display_name || 'Familiar',
              role: data.role || 'member',
              status: data.status || 'active',
              groupIds: Array.isArray(data.groupIds) ? data.groupIds : [],
              photo_url: data.photo_url,
              created_at: data.created_at,
              updated_at: data.updated_at,
            };
          })
          .filter((m) => m.status !== 'pending_approval' && m.status !== 'unverified_email');
        onMembers(members);
      },
      (err) => {
        if (onError) onError(err);
        else console.error('Error escuchando miembros familiares:', err);
      }
    );
  }

  /**
   * Purga y elimina completamente los datos de un familiar en Firestore y Whitelist.
   * BR-ADM-02: El administrador no puede auto-eliminarse.
   * BR-ADM-03: Elimina documento de usuario y entrada de whitelist; el cliente del usuario purga su credencial en Firebase Auth.
   */
  async purgeMember(
    targetUid: string,
    currentAdminUid: string,
    targetEmail?: string
  ): Promise<void> {
    if (targetUid === currentAdminUid) {
      throw new Error('No puedes purgar tu propia cuenta de administrador.');
    }

    const userRef = doc(this.db, 'users', targetUid);
    let emailToClean = targetEmail ? targetEmail.trim().toLowerCase() : '';

    if (!emailToClean) {
      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data?.email === 'string') {
            emailToClean = data.email.trim().toLowerCase();
          }
        }
      } catch {
        // Continuar con el borrado del documento principal aunque falle la lectura previa
      }
    }

    await deleteDoc(userRef);

    if (emailToClean && emailToClean.includes('@')) {
      const whitelistRef = doc(this.db, 'whitelist', emailToClean);
      await deleteDoc(whitelistRef);
    }

    await this.deleteRemoteAuthAccount(targetUid);
  }

  /**
   * Invoca el endpoint del Worker de Cloudflare (/api/admin/delete-user)
   * para eliminar inmediatamente la cuenta en Firebase Authentication.
   */
  private async deleteRemoteAuthAccount(targetUid: string): Promise<void> {
    if (typeof fetch === 'undefined' || !isFirebaseConfigured()) {
      return;
    }

    try {
      const { auth } = getFirebaseServices();
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ targetUid }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        console.warn(
          'Aviso al eliminar cuenta en Firebase Authentication:',
          data.error || response.status
        );
      }
    } catch (err) {
      console.warn('No se pudo contactar con /api/admin/delete-user:', err);
    }
  }
}

