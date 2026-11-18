# Propuesta de Cambio: Sistema de Grupos Multiusuario para Mapa, Chat y Administración

```yaml
change_id: "2026-11-user-groups-map-chat-admin"
title: "Sistema de Grupos Multiusuario para Mapa Chat y Administracion"
module: "admin"
status: CONSOLIDATED
consolidated_at: "2026-11-18"
created_at: "2026-11-18"
author: "Antigravity"
tier: standard
```

---

## 1. Motivación y Contexto

Actualmente, todos los miembros aprobados pertenecen a una única vista global no segmentada en el mapa y en el chat.
Se requiere habilitar la capacidad de:
1. **Crear y eliminar Grupos** por parte del Administrador desde la sección `Grupos` del panel de administración.
2. **Asignar miembros a uno o varios grupos** simultáneamente.
3. **El Administrador** tiene visibilidad y membresía automática en todos los grupos.
4. **En el Mapa:** Un selector permite ver un grupo en particular o la opción "Todos". Si el usuario solo tiene un grupo, se muestra una insignia fija. La ubicación propia se emite y comparte con todos los grupos a los que pertenece el usuario.
5. **En el Chat:** El chat pasa a ser por grupo (subcolección o canal `groups/{groupId}/messages`). En la cabecera aparece el nombre del grupo; si el usuario tiene varios grupos asignados, el título actúa como selector desplegable para cambiar de conversación grupal.
6. **Usuarios sin grupo asignado:** Si un usuario no tiene grupos asignados (o se elimina el único grupo al que pertenecía), la aplicación le muestra la pantalla de bloqueo en espera:
   *"Esperando asignación a un grupo"*
   *"Tu cuenta está activa, pero aún no has sido asignado a ningún grupo. El administrador te asignará pronto."* con acciones `Comprobar de nuevo` y `Cerrar sesión`.
7. **Migración transparente:** Existencia garantizada del grupo inicial `"Familia"` para que los usuarios existentes no queden bloqueados.

---

## 2. Delta de Especificación

### Contratos Afectados
- **[+] Añadido:** `CT-GRP-01: Group, GroupChatMessage` en `src/admin/types.ts` y `src/chat/types.ts`
  - Estructura del grupo `{ id: string, name: string, created_at: unknown, created_by: string }`.
- **[+] Añadido:** `CT-GRP-02: GroupService` en `src/admin/group_service.ts`
  - Métodos `createGroup(name, adminUid)`, `deleteGroup(groupId)`, `subscribeToGroups(onGroups)`, `assignUserGroups(uid, groupIds)`, `ensureDefaultGroup(adminUid)`.
- **[~] Modificado:** `CT-01 / UserProfile` en `src/auth/types.ts`
  - Añadido campo opcional `groupIds?: string[]`.
- **[~] Modificado:** `CT-CHAT-02: FamilyChatService` en `src/chat/chat_service.ts`
  - Métodos parametrizados con `groupId`: `sendMessage(groupId, sender, text)` y `subscribeToGroupMessages(groupId, onMessages)`.
- **[~] Modificado:** `CT-AUTH-03: Gatekeeper` en `src/auth/gatekeeper.ts` y `src/ui/components/GatekeeperScreen.ts`
  - Detección de usuario activo sin grupos (`!groupIds || groupIds.length === 0`) para miembros no-admin, mostrando pantalla de espera de asignación.
- **[~] Modificado:** `MapView` en `src/location/views/MapView.ts`
  - Soporte de selector de grupo (`Todos` o grupos del usuario), insignia fija si solo tiene 1 grupo, filtrado reactivo de marcadores y lista inferior.
- **[~] Modificado:** `ChatView` en `src/chat/views/ChatView.ts`
  - Desplegable de cambio de grupo en cabecera si tiene múltiples grupos, insignia si solo tiene 1, y cambio reactivo de canal.

### Invariantes y Reglas Afectadas
- **[+] Añadido:** `BR-GRP-01`: El administrador tiene acceso y pertenencia implícita a todos los grupos creados.
- **[+] Añadido:** `BR-GRP-02`: Si se elimina un grupo, se purga de `groupIds` de todos los usuarios vinculados. Si un usuario queda con 0 grupos, pasa reactivamente al estado de espera de asignación.
- **[+] Añadido:** `BR-GRP-03`: La ubicación del usuario se reporta de forma única en `/users/{uid}.location` y es accesible para todos los grupos a los que pertenece.

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- **Usuarios existentes sin campo `groupIds`:** La función `ensureDefaultGroup` y la lectura de usuarios asignan por defecto el grupo inicial `"Familia"` si un usuario no tiene grupos asignados.
- **Eliminación del grupo activo:** Si el usuario está navegando en el grupo que el admin elimina, la vista conmuta al siguiente grupo disponible o a la pantalla de espera de asignación si no le queda ninguno.
- **Cuotas Spark:** Las subcolecciones `/groups/{groupId}/messages` mantienen el límite de 50 mensajes y orden cronológico.
