# Tareas de Implementación: Sistema de Grupos Multiusuario para Mapa Chat y Administracion

> Checklist de ejecución técnica asociado a `proposal.md`.
> El agente debe marcar con `[x]` cada tarea conforme se complete y verifique.

---

## 1. Fase de Especificación y Diseño
- [x] Validar propuesta y requisitos con el usuario (aprobado).
- [x] Redactar proposal.md y tasks.md en `.ai-harness/sdd/changes/2026-11-user-groups-map-chat-admin/`.

## 2. Fase de Servicios de Dominio y Backend
- [x] Definir tipos de Grupo (`Group`, `GroupChatMessage`, `groupIds` en `UserProfile`).
- [x] Implementar `GroupService` en `src/admin/group_service.ts` (CRUD de grupos, asignación multi-grupo, grupo por defecto "Familia", purga de `groupId` al borrar grupo).
- [x] Adaptar `FamilyChatService` en `src/chat/chat_service.ts` para soportar chats segmentados por `groupId` (`/groups/{groupId}/messages`).
- [x] Adaptar `Gatekeeper` (`src/auth/gatekeeper.ts` y `src/ui/components/GatekeeperScreen.ts`) para soportar `waiting_group_assignment`.

## 3. Fase de Interfaz de Usuario
- [x] Actualizar `AdminView.ts`:
  - Sección "Grupos" con creación y eliminación de grupos.
  - Gestión de grupos por usuario en "Usuarios Registrados" (chips y asignación múltiple).
- [x] Actualizar `MapView.ts`:
  - Integrar selector de grupos ("Todos" + grupos del usuario) o insignia fija si solo tiene 1 grupo.
  * Filtrar marcadores y lista de contactos según el grupo activo o "Todos".
- [x] Actualizar `ChatView.ts`:
  - Cabecera con selector desplegable de grupo si tiene >1 grupo o nombre fijo si solo tiene 1.
  * Conexión dinámica a la sala del grupo seleccionado.
- [x] Actualizar `main.ts` para orquestar la resolución de grupos, suscripciones y flujo de gatekeeper.

## 4. Fase de Pruebas y Validación Determinista
- [x] Escribir y actualizar tests unitarios en `tests/unit/admin/`, `tests/unit/chat/` y `tests/unit/location/`.
- [x] Ejecutar `npx vitest run` y comprobar 100% verde.
- [x] Ejecutar `npm run build` y comprobar 0 errores de tipado o compilación.
- [x] Ejecutar validadores del arnés (`harness-validator`, `preflight`, `sync-sdd`).
