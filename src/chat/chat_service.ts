import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { ChatMessage, ChatSender } from './types';

export const MAX_MESSAGE_LENGTH = 500;
export const DEFAULT_MESSAGE_LIMIT = 50;

export class FamilyChatService {
  constructor(private readonly db: Firestore) {}

  /**
   * Envía un mensaje al canal familiar grupal.
   * Valida longitud máxima de 500 caracteres e impide envíos vacíos.
   */
  async sendMessage(sender: ChatSender, rawText: string): Promise<string> {
    const text = rawText.trim();
    if (!text) {
      throw new Error('El mensaje no puede estar vacío.');
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`El mensaje supera el límite de ${MAX_MESSAGE_LENGTH} caracteres.`);
    }

    const chatCol = collection(this.db, 'group_chat');
    const docRef = await addDoc(chatCol, {
      sender_id: sender.uid,
      sender_name: sender.name,
      sender_photo: sender.photoUrl || null,
      text,
      created_at: Date.now(),
    });

    return docRef.id;
  }

  /**
   * Suscribe a los mensajes más recientes del canal grupal (por defecto máx 50).
   * Devuelve los mensajes en orden cronológico ascendente (antiguos primero).
   */
  subscribeToRecentMessages(
    onMessages: (messages: ChatMessage[]) => void,
    limitCount = DEFAULT_MESSAGE_LIMIT,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const chatCol = collection(this.db, 'group_chat');
    const q = query(chatCol, orderBy('created_at', 'desc'), limit(limitCount));

    return onSnapshot(
      q,
      (snapshot) => {
        const descMessages: ChatMessage[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            sender_id: data.sender_id || '',
            sender_name: data.sender_name || 'Familiar',
            sender_photo: data.sender_photo || undefined,
            text: data.text || '',
            created_at: data.created_at || 0,
          };
        });

        // Invertir para mostrar en orden cronológico natural
        const chronological = descMessages.reverse();
        onMessages(chronological);
      },
      (error) => {
        if (onError) {
          onError(error);
        } else {
          console.error('Error escuchando mensajes del chat familiar:', error);
        }
      }
    );
  }
}

