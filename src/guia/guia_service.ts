import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { GroupTrip } from './types';

export class GuiaService {
  constructor(private readonly db: Firestore) {}

  /**
   * Suscribe en tiempo real a los viajes e itinerarios de un grupo.
   */
  subscribeToGroupTrips(
    groupId: string,
    onTrips: (trips: GroupTrip[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!groupId) {
      onTrips([]);
      return () => {};
    }

    const tripsCol = collection(this.db, 'groups', groupId, 'trips');
    const q = query(tripsCol, orderBy('created_at', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const trips: GroupTrip[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            groupId,
            metadatos: data.metadatos || {
              destino: 'Destino',
              alojamiento_ubicacion: '',
              fecha_llegada: '',
              fecha_salida: '',
              duracion_dias: 1,
              resumen_estilo: '',
              created_by: '',
              created_by_name: '',
            },
            plan_diario: Array.isArray(data.plan_diario) ? data.plan_diario : [],
            created_at: data.created_at || 0,
          };
        });
        onTrips(trips);
      },
      (error) => {
        if (onError) {
          onError(error);
        } else {
          console.error(`Error al suscribir a viajes del grupo ${groupId}:`, error);
        }
      }
    );
  }

  /**
   * Guarda un nuevo viaje e itinerario para el grupo.
   */
  async createTrip(
    groupId: string,
    tripData: Omit<GroupTrip, 'id' | 'created_at'>
  ): Promise<string> {
    if (!groupId) {
      throw new Error('ID de grupo requerido para registrar un viaje.');
    }
    const tripsCol = collection(this.db, 'groups', groupId, 'trips');
    const docRef = await addDoc(tripsCol, {
      ...tripData,
      groupId,
      created_at: Date.now(),
    });
    return docRef.id;
  }

  /**
   * Elimina un viaje del grupo.
   */
  async deleteTrip(groupId: string, tripId: string): Promise<void> {
    if (!groupId || !tripId) return;
    const tripRef = doc(this.db, 'groups', groupId, 'trips', tripId);
    await deleteDoc(tripRef);
  }
}
