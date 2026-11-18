import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { ChatMessage, ChatSender } from './types';

export const MAX_MESSAGE_LENGTH = 500;
export const DEFAULT_MESSAGE_LIMIT = 50;

export class FamilyChatService {
  private messageCache = new Map<string, ChatMessage[]>();

  constructor(private readonly db: Firestore) {}

  /**
   * Obtiene mensajes en caché para un grupo (o canal general).
   */
  getCachedMessages(groupId?: string): ChatMessage[] | undefined {
    const key = groupId || 'general';
    return this.messageCache.get(key);
  }

  /**
   * Limpia la memoria caché de mensajes.
   */
  clearCache(): void {
    this.messageCache.clear();
  }

  /**
   * Precarga en segundo plano los mensajes más recientes de un grupo para cambio instantáneo sin parpadeo.
   */
  async preloadGroupMessages(groupId?: string, limitCount = DEFAULT_MESSAGE_LIMIT): Promise<ChatMessage[]> {
    const key = groupId || 'general';
    if (this.messageCache.has(key)) {
      return this.messageCache.get(key)!;
    }

    const chatCol = groupId && groupId !== 'general'
      ? collection(this.db, 'groups', groupId, 'messages')
      : collection(this.db, 'group_chat');
    const q = query(chatCol, orderBy('created_at', 'desc'), limit(limitCount));

    try {
      const snap = await getDocs(q);
      const descMessages: ChatMessage[] = snap.docs.map((d) => {
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

      const chronological = descMessages.reverse();
      this.messageCache.set(key, chronological);
      return chronological;
    } catch (e) {
      return [];
    }
  }

  /**
   * Envía un mensaje al canal familiar grupal o a un grupo específico.
   * Valida longitud máxima de 500 caracteres e impide envíos vacíos.
   */
  async sendMessage(sender: ChatSender, rawText: string, groupId?: string): Promise<string> {
    const text = rawText.trim();
    if (!text) {
      throw new Error('El mensaje no puede estar vacío.');
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`El mensaje supera el límite de ${MAX_MESSAGE_LENGTH} caracteres.`);
    }

    const chatCol = groupId && groupId !== 'general'
      ? collection(this.db, 'groups', groupId, 'messages')
      : collection(this.db, 'group_chat');

    const docRef = await addDoc(chatCol, {
      sender_id: sender.uid,
      sender_name: sender.name,
      sender_photo: sender.photoUrl || null,
      text,
      created_at: Date.now(),
      group_id: groupId || 'general',
    });

    return docRef.id;
  }

  /**
   * Suscribe a los mensajes más recientes del canal grupal o grupo específico (por defecto máx 50).
   * Devuelve los mensajes en orden cronológico ascendente (antiguos primero).
   * Si existen mensajes en caché local, los entrega inmediatamente (0ms) antes de conectar el listener.
   */
  subscribeToRecentMessages(
    onMessages: (messages: ChatMessage[]) => void,
    limitCount = DEFAULT_MESSAGE_LIMIT,
    onError?: (error: Error) => void,
    groupId?: string
  ): Unsubscribe {
    const key = groupId || 'general';

    // Entrega inmediata si hay caché disponible (Stale-While-Revalidate)
    const cached = this.messageCache.get(key);
    if (cached && cached.length > 0) {
      onMessages(cached);
    }

    const chatCol = groupId && groupId !== 'general'
      ? collection(this.db, 'groups', groupId, 'messages')
      : collection(this.db, 'group_chat');
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
        this.messageCache.set(key, chronological);
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

