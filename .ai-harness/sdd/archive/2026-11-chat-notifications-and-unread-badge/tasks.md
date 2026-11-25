# Tareas de Implementación: Notificaciones multiplataforma de mensajes de chat por grupo y globo rojo de no leidos

> Checklist de ejecución técnica asociado a `proposal.md`.
> El agente debe marcar con `[x]` cada tarea conforme se complete y verifique.

---

## 1. Fase de Especificación y Diseño
- [x] Validar la propuesta con el usuario / equipo de producto.
- [x] Confirmar que no hay colisión con otros cambios en curso en `changes/`.

## 2. Fase de Consolidación Documental
- [x] Ejecutar `/consolidate-change` (o aplicar delta en `modules/[modulo].md`).
- [x] Commit documental: `docs(specs): consolidar 2026-11-chat-notifications-and-unread-badge`.

## 3. Fase de Implementación de Código
- [x] Ampliar `UserProfile`, `ProfileUpdatePayload` y `ProfileService` con `chat_notifications_enabled` y persistencia local/Firestore.
- [x] Implementar `src/chat/chat_notification_monitor.ts` con detección de mensajes nuevos por grupo, notificaciones multiplataforma (iOS, Android, Desktop Web + banner in-app) y limpieza de listeners (`FM-002`).
- [x] Actualizar `FloatingTabBar.ts` y `tokens.css` para mostrar el globo rojo con el número de mensajes nuevos sobre la opción Chat y limpiarlo al entrar en Chat.
- [x] Añadir el selector de activación/desactivación de notificaciones de chat en `ProfileView.ts`.
- [x] Integrar el monitor de notificaciones en `src/main.ts` y manejo de `notificationclick` en `public/sw.js`.

## 4. Fase de Pruebas y Validación Determinista
- [x] Escribir pruebas unitarias para el monitor de notificaciones, preferencia de perfil y globo rojo en `FloatingTabBar`.
- [x] Ejecutar suite de tests del proyecto y verificar 100% verde.
- [x] Ejecutar `preflight` del arnés.
- [x] Ejecutar `sync-sdd` y comprobar cero deriva.
