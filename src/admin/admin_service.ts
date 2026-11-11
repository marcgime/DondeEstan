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
import type { SystemConfig, WhitelistRecord } from './types';
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
  async approveMember(uid: string, email?: string): Promise<void> {
    const userRef = doc(this.db, 'users', uid);
    await updateDoc(userRef, {
      status: 'active',
      approved_at: Date.now(),
    });

    if (email) {
      const normEmail = email.trim().toLowerCase();
      const whitelistRef = doc(this.db, 'whitelist', normEmail);
      await setDoc(
        whitelistRef,
        {
          status: 'active',
          uid,
          updated_at: Date.now(),
        },
        { merge: true }
      );
    }
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
   * Suscribe en tiempo real a los registros de la lista blanca.
   */
  subscribeToWhitelist(
    onRecords: (records: WhitelistRecord[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const col = collection(this.db, 'whitelist');
    return onSnapshot(
      col,
      (snapshot) => {
        const records: WhitelistRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            email: d.id,
            status: data.status || 'preapproved',
            added_at: data.added_at || 0,
            uid: data.uid || null,
          };
        });
        onRecords(records);
      },
      (err) => {
        if (onError) onError(err);
        else console.error('Error escuchando whitelist:', err);
      }
    );
  }

  /**
   * Purga y elimina completamente los datos de un familiar en Firestore.
   * BR-ADM-02: El administrador no puede auto-eliminarse.
   */
  async purgeMember(targetUid: string, currentAdminUid: string): Promise<void> {
    if (targetUid === currentAdminUid) {
      throw new Error('No puedes purgar tu propia cuenta de administrador.');
    }

    const userRef = doc(this.db, 'users', targetUid);
    await deleteDoc(userRef);
  }
}

