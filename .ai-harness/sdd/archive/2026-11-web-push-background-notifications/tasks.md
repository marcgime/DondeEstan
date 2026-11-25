# Tareas de Implementación: Notificaciones Web Push en segundo plano para móvil en reposo

---

## 1. Fase de Especificación y Consolidación
- [x] Redactar propuesta y consolidar en `MOD-core` y `MOD-chat`.

## 2. Fase de Implementación
- [x] Implementar criptografía Web Push (JWT VAPID ES256 + ECDH P-256 + HKDF + AES-128-GCM RFC 8291) y endpoints `/api/push/vapid-key` y `/api/chat/notify` en `src/core/worker.ts`.
- [x] Añadir `subscribeToWebPush` y `unsubscribeFromWebPush` en `src/core/pwa.ts`.
- [x] Añadir campo `push_subscriptions` en `UserProfile` y sincronización en `src/chat/chat_notification_monitor.ts`, `src/profile/views/ProfileView.ts` y `src/main.ts`.
- [x] Disparar `POST /api/chat/notify` al enviar mensajes en `src/chat/views/ChatView.ts`.
- [x] Añadir listener `self.addEventListener('push', ...)` en `public/sw.js`.

## 3. Fase de Pruebas y Validación
- [x] Escribir pruebas unitarias para cifrado Web Push y endpoints del Worker.
- [x] Ejecutar `npm test`, `npm run build` y validadores del arnés.
