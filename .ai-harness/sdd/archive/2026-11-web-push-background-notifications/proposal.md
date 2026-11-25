# Propuesta de Cambio: Notificaciones Web Push en segundo plano para móvil en reposo (iOS, Android y Escritorio)

```yaml
change_id: "2026-11-web-push-background-notifications"
title: "Notificaciones Web Push en segundo plano para móvil en reposo (iOS, Android y Escritorio)"
module: "MOD-core"
status: CONSOLIDATED
consolidated_at: "2026-11-25"
created_at: "2026-11-25"
author: "Antigravity"
tier: standard
```

---

## 1. Motivación y Contexto

Cuando el teléfono móvil está en reposo (pantalla apagada, app en segundo plano o cerrada), iOS Safari y Android Chrome suspenden la ejecución de JavaScript de la página y las conexiones `onSnapshot` de Firestore. Por ello, las notificaciones locales disparadas desde el cliente no llegan si el dispositivo está en reposo.

Para garantizar la entrega de avisos en reposo o con la app cerrada en **iOS (16.4+ PWA en pantalla de inicio), Android y Escritorio Web**, se implementa **Web Push estándar (VAPID RFC 8292 + cifrado `aes128gcm` RFC 8291)** directamente desde el Cloudflare Worker existente (`src/core/worker.ts`) y el Service Worker (`public/sw.js`).

---

## 2. Delta de Especificación

### Contratos Afectados
- **[+] Añadido:** `CT-CORE-03: Endpoints Web Push en Worker` (`src/core/worker.ts`)
  - `GET /api/push/vapid-key`: devuelve la clave pública VAPID (generando y persistiendo automáticamente el par de claves ECDSA P-256 en Firestore `config/web_push` si no existiera, o leyendo `env.VAPID_PUBLIC_KEY`).
  - `POST /api/chat/notify`: verifica el token de Firebase Auth del remitente, obtiene los compañeros del grupo (`groupId`) con `chat_notifications_enabled !== false` y envía la notificación cifrada (`aes128gcm` + JWT VAPID `ES256`) a sus suscripciones Push registradas.
- **[+] Añadido:** `CT-CORE-04: Gestión de Suscripción Web Push en Cliente` (`src/core/pwa.ts`)
  - `subscribeToWebPush()` / `unsubscribeFromWebPush()`: suscribe o cancela la suscripción en `registration.pushManager` usando la clave pública VAPID y devuelve la `PushSubscription` serializada.
- **[~] Modificado:** `CT-CHAT-02` y `CT-CHAT-04` (`src/chat/chat_notification_monitor.ts`, `src/chat/views/ChatView.ts`)
  - Sincronización automática de la suscripción Push del dispositivo en `/users/{uid}.push_subscriptions` al iniciar sesión o activar el interruptor en Perfil.
  - Al enviar un mensaje en `ChatView`, invocación asíncrona no bloqueante a `POST /api/chat/notify`.
- **[~] Modificado:** `public/sw.js`
  - Listener `push` que despierta al Service Worker aunque el dispositivo esté en reposo y muestra la notificación del sistema (`self.registration.showNotification`) además de actualizar el badge de la app (`navigator.setAppBadge`).

### Invariantes y Reglas Afectadas
- **[+] Añadido:** `BR-CORE-03:` La clave privada VAPID nunca se expone al cliente ni al repositorio; permanece exclusivamente en Cloudflare Workers / documento privado `config/web_push` inaccesible desde reglas cliente de Firestore.
- **[+] Añadido:** `BR-CHAT-05:` Solo los compañeros activos pertenecientes al `groupId` del mensaje con `chat_notifications_enabled !== false` reciben la notificación Web Push en segundo plano.
