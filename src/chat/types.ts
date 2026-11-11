export interface ChatSender {
  uid: string;
  name: string;
  photoUrl?: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_photo?: string;
  text: string;
  created_at: number; // timestamp en milisegundos
}

export interface SendMessagePayload {
  sender: ChatSender;
  text: string;
}

