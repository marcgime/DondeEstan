import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  arrayRemove,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Group } from './types';
import type { UserProfile } from '../auth/types';

export const DEFAULT_GROUP_NAME = 'Familia';

export class GroupService {
  constructor(private readonly db: Firestore) {}

  /**
   * Crea un nuevo grupo familiar/amigos.
   */
  async createGroup(name: string, adminUid: string): Promise<string> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('El nombre del grupo no puede estar vacío.');
    }
    if (trimmed.length > 50) {
      throw new Error('El nombre del grupo no puede superar los 50 caracteres.');
    }

    const groupsCol = collection(this.db, 'groups');
    const docRef = await addDoc(groupsCol, {
      name: trimmed,
      created_at: Date.now(),
      created_by: adminUid,
    });

    return docRef.id;
  }

  /**
   * Elimina un grupo y remueve el groupId de todos los usuarios asignados.
   */
  async deleteGroup(groupId: string): Promise<void> {
    if (!groupId) return;

    // 1. Eliminar documento del grupo
    const groupRef = doc(this.db, 'groups', groupId);
    await deleteDoc(groupRef);

    // 2. Remover groupId de los usuarios que lo tenían
    const usersCol = collection(this.db, 'users');
    const snapshot = await getDocs(usersCol);

    const updatePromises: Promise<void>[] = [];
    snapshot.docs.forEach((userDoc) => {
      const data = userDoc.data();
      const groupIds: string[] = Array.isArray(data.groupIds) ? data.groupIds : [];
      if (groupIds.includes(groupId)) {
        updatePromises.push(
          updateDoc(doc(this.db, 'users', userDoc.id), {
            groupIds: arrayRemove(groupId),
          })
        );
      }
    });

    await Promise.all(updatePromises);
  }

  /**
   * Suscribe en tiempo real al listado de grupos disponibles.
   */
  subscribeToGroups(
    onGroups: (groups: Group[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const groupsCol = collection(this.db, 'groups');
    const q = query(groupsCol, orderBy('created_at', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const groups: Group[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Grupo',
            created_at: data.created_at || 0,
            created_by: data.created_by || '',
            guia_enabled: Boolean(data.guia_enabled),
          };
        });
        onGroups(groups);
      },
      (error) => {
        if (onError) {
          onError(error);
        } else {
          console.error('Error al suscribir a grupos:', error);
        }
      }
    );
  }

  /**
   * Habilita o deshabilita la visualización del módulo de GuIA para un grupo.
   */
  async setGroupGuiaEnabled(groupId: string, enabled: boolean): Promise<void> {
    if (!groupId) {
      throw new Error('ID de grupo no válido.');
    }
    const groupRef = doc(this.db, 'groups', groupId);
    await updateDoc(groupRef, {
      guia_enabled: Boolean(enabled),
    });
  }

  /**
   * Asigna la lista de IDs de grupo a un usuario.
   */
  async assignUserGroups(targetUid: string, groupIds: string[]): Promise<void> {
    if (!targetUid) {
      throw new Error('UID de usuario no válido.');
    }
    const userRef = doc(this.db, 'users', targetUid);
    await updateDoc(userRef, {
      groupIds: Array.from(new Set(groupIds)),
    });
  }

  /**
   * Garantiza la existencia del grupo por defecto "Familia" y asocia a usuarios sin grupo.
   */
  async ensureDefaultGroup(adminUid: string): Promise<Group> {
    const groupsCol = collection(this.db, 'groups');
    const snapshot = await getDocs(groupsCol);

    let defaultGroup: Group | null = null;
    snapshot.docs.forEach((d) => {
      const data = d.data();
      if (data.name?.toLowerCase() === DEFAULT_GROUP_NAME.toLowerCase()) {
        defaultGroup = {
          id: d.id,
          name: data.name,
          created_at: data.created_at || 0,
          created_by: data.created_by || adminUid,
        };
      }
    });

    if (!defaultGroup) {
      const newId = await this.createGroup(DEFAULT_GROUP_NAME, adminUid);
      defaultGroup = {
        id: newId,
        name: DEFAULT_GROUP_NAME,
        created_at: Date.now(),
        created_by: adminUid,
      };
    }

    // Migrar usuarios activos sin groupIds
    const usersCol = collection(this.db, 'users');
    const usersSnapshot = await getDocs(usersCol);
    const migrationPromises: Promise<void>[] = [];

    usersSnapshot.docs.forEach((userDoc) => {
      const data = userDoc.data();
      const currentGroups = data.groupIds;
      if (!Array.isArray(currentGroups) || currentGroups.length === 0) {
        migrationPromises.push(
          updateDoc(doc(this.db, 'users', userDoc.id), {
            groupIds: [defaultGroup!.id],
          })
        );
      }
    });

    await Promise.all(migrationPromises);
    return defaultGroup;
  }

  /**
   * Obtiene los grupos accesibles para un usuario dado.
   * Regla de negocio BR-GRP-01: El Administrador tiene acceso a TODOS los grupos.
   */
  getUserGroups(user: UserProfile, allGroups: Group[]): Group[] {
    if (user.role === 'admin') {
      return allGroups;
    }
    const userGroupSet = new Set(user.groupIds || []);
    return allGroups.filter((g) => userGroupSet.has(g.id));
  }
}
