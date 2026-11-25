# Propuesta de Cambio: Notificaciones multiplataforma de mensajes de chat por grupo y globo rojo de no leidos

```yaml
change_id: "2026-11-chat-notifications-and-unread-badge"
title: "Notificaciones multiplataforma de mensajes de chat por grupo y globo rojo de no leidos"
module: "MOD-chat"
status: CONSOLIDATED
consolidated_at: "2026-11-25"
created_at: "2026-11-25"
author: "Antigravity"
tier: standard
```

---

## 1. Motivación y Contexto

Se requiere que cuando un compañero de grupo envíe un mensaje nuevo en el canal de chat:
1. Aparezca una notificación en el dispositivo del usuario (compatible con iOS PWA/Safari, Android PWA/Chrome y Escritorio Web).
2. El aviso llegue únicamente a los compañeros de ese grupo (`groupService.getUserGroups(user, allGroups)`).
3. Desde el Perfil de usuario (`ProfileView`), cada usuario pueda activar o desactivar si desea mostrar esas notificaciones (`chat_notifications_enabled`).
4. En el menú inferior (`FloatingTabBar`), aparezca un globo rojo sobre la opción **Chat** (`#chat-unread-badge`) con el número de mensajes nuevos no leídos siempre que haya mensajes pendientes, y desaparezca automáticamente en cuanto el usuario entre en el menú de **Chat**.

---

## 2. Delta de Especificación (Cambios sobre los Módulos Maestros)

### Contratos Afectados
- **[+] Añadido:** `CT-CHAT-04: ChatNotificationMonitor` (`src/chat/chat_notification_monitor.ts`)
  - Monitor reactivo por grupos del usuario que escucha nuevos mensajes (`onSnapshot` con desconexión determinista `FM-002`), ignora la carga inicial e ignora los mensajes propios del usuario (`sender_id === currentUser.uid`), incrementa el contador de no leídos cuando el usuario no está en la pestaña `chat` y dispara notificaciones multiplataforma (Service Worker `showNotification`, Web `Notification` API y banner flotante in-app) si el usuario tiene las notificaciones activadas.
- **[~] Modificado:** `CT-UI-06: renderFloatingTabBar` (`src/ui/components/FloatingTabBar.ts`)
  - Añade soporte para `chatUnreadCount` y estado reactivo `setGlobalChatUnreadCount` / `getGlobalChatUnreadCount` que muestra un globo rojo (`#chat-unread-badge`) con el número de mensajes nuevos sobre el botón `#nav-btn-chat` y lo oculta al entrar en la pestaña `chat`.
- **[~] Modificado:** `CT-01 / CT-03` en `MOD-profile` (`src/profile/types.ts`, `src/profile/profile_service.ts`, `src/profile/views/ProfileView.ts`)
  - Añade preferencia `chat_notifications_enabled` en `UserProfile`, `updateChatNotifications` en `ProfileService` y control interruptor en `ProfileView` con solicitud de permiso nativo de notificaciones bajo gesto del usuario.

### Invariantes y Reglas Afectadas
- **[+] Añadido:** `BR-CHAT-04:` Las notificaciones y el contador de mensajes nuevos solo se emiten para mensajes entrantes de otros miembros pertenecientes a los grupos del usuario (`sender_id !== currentUser.uid`), limpiando todos los listeners al cerrar sesión o cambiar de grupos (`FM-002`).
- **[+] Añadido:** `BR-UI-06:` El botón de Chat en `FloatingTabBar` muestra un globo rojo (`bg-status-error`) con el número de mensajes no leídos cuando `unreadCount > 0` y desaparece al entrar en la pestaña `chat`.
- **[+] Añadido:** `BR-PROFILE-05:` El usuario puede habilitar o deshabilitar las notificaciones de chat desde su perfil (`ProfileView`), persistiendo la preferencia en Firestore y `localStorage`.

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- **¿Rompe consumidores existentes?** No. Todos los nuevos parámetros son opcionales y retrocompatibles.
- **Compatibilidad iOS / Android / Desktop:** Utiliza `ServiceWorkerRegistration.showNotification` (requerido en Android Chrome e iOS 16.4+ Web Push/PWA), fallback a `new Notification()` en escritorio, `navigator.setAppBadge`, y un aviso visual flotante in-app cuando la aplicación está abierta en primer plano o en navegadores sin permiso de sistema.
