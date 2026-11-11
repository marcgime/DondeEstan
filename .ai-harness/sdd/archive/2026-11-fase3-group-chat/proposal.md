# Propuesta de Cambio: Fase 3 — Canal Único de Chat Grupal Familiar y Navegación Reactiva

```yaml
change_id: "2026-11-fase3-group-chat"
title: "Fase 3: Canal Único de Chat Grupal Familiar y Navegación Reactiva"
module: "MOD-chat"
status: CONSOLIDATED
consolidated_at: "2026-11-11"
created_at: "2026-11-11"
author: "Antigravity"
tier: core
```

---

## 1. Motivación y Contexto

Habilitar la capacidad central de mensajería grupal instantánea para el núcleo familiar según el [PRD.docx](../../input/PRD.docx) (§4 Módulo 2 y §2 Arquitectura de Coste Cero):

1. **Canal único cerrado:** Los 8 miembros comparten un único hilo grupal (`group_chat`), garantizando simplicidad y cero overhead de gestión de chats o grupos.
2. **Blindaje de cuota Spark y Coste Cero:**
   - La consulta se acota estrictamente a los últimos 50 mensajes (`limit(50)`).
   - Suscripción inteligente: el listener `onSnapshot` del chat solo se mantiene activo mientras el usuario está visualizando la pestaña de Chat, desconectándose al volver al Mapa para evitar lecturas pasivas de Firestore y drenaje de batería.
   - Prevención de doble envío mediante bloqueo del botón de envío durante la transacción.
3. **Fidelidad visual Kinetic Bloom:** Burbujas con curvaturas orgánicas píldora (`rounded-3xl`), violeta marca (`#6b38fb`) para mensajes propios, superficie translúcida para mensajes ajenos, avatares circulares y barra de navegación inferior integrada.

---

## 2. Delta de Especificación (Cambios sobre Módulos)

### Módulo Principal Afectado: `MOD-chat` (`src/chat/`)

#### Contratos Afectados:
- **[+] `CT-CHAT-01: GroupChatMessage` (`src/chat/types.ts`):**
  - Estructura inmutable: `{ id: string, sender_id: string, sender_name: string, sender_photo?: string, text: string, created_at: number }`.
- **[+] `CT-CHAT-02: FamilyChatService` (`src/chat/chat_service.ts`):**
  - Métodos:
    - `sendMessage(sender: ChatSender, text: string): Promise<string>`
    - `subscribeToRecentMessages(limitCount: number, onMessages: (messages: ChatMessage[]) => void): Unsubscribe`
  - Invariante: Mensajes limitados a 500 caracteres, rechazo de texto vacío tras sanitización.
- **[+] `CT-CHAT-03: FamilyChatView` (`src/chat/views/ChatView.ts`):**
  - Renderizado reactivo de la conversación con scroll automático hacia el último mensaje, input táctil flotante con prevención de doble envío.
- **[+] `CT-CHAT-04: BottomNavRouter` (`src/main.ts` y componentes de vista):**
  - Enrutador de pestañas (`map` | `chat`) en el Dock inferior con ciclo de vida limpio y cancelación de listeners inactivos.

#### Reglas de Negocio (BR-*):
- **`BR-CHAT-01` (Límite Spark de Mensajes):** Ninguna consulta a la colección `group_chat` puede superar los 50 documentos.
- **`BR-CHAT-02` (Desconexión Activa de Escucha):** Al conmutar de la vista de Chat a otra pestaña, se invoca inmediatamente `unsubscribe()` para detener lecturas innecesarias.
- **`BR-CHAT-03` (Inmutabilidad de Mensajes):** Los mensajes en Firestore son append-only; las reglas de seguridad prohíben su edición (`allow update: if false;`).

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- **Compatibilidad:** No altera los contratos existentes de `MOD-auth` ni `MOD-location`.
- **Colección Firestore:** Usa `group_chat`, ya contemplada en [firestore.rules](../../../firestore.rules).
- **Rendimiento:** Paginación invertida en memoria para mostrar el historial en orden cronológico ascendente a partir de la consulta descendente de Firestore.
