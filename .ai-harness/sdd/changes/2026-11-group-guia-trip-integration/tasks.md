# Tareas de Implementación: Integración de GuIA por Grupo y Pestaña de Viajes Condicional

> Checklist de ejecución técnica asociado a `proposal.md`.
> **Estado:** IMPLEMENTADO EN LOCAL (LISTO PARA PRUEBAS POR EL USUARIO).
> Nota de seguridad: NO subir a GitHub ni a Cloudflare (entorno local exclusivo para pruebas).

---

## 1. Fase de Especificación y Diseño
- [x] Redactar `proposal.md` con contratos, invariantes y reglas de negocio.
- [x] Validar la propuesta con el usuario y confirmar alcance.
- [x] Confirmar aprobación formal del usuario antes de iniciar la codificación.

## 2. Fase de Modelo y Persistencia (Backend / Firestore)
- [x] Ampliar interfaz `Group` con `guia_enabled?: boolean` en `src/admin/types.ts`.
- [x] Implementar `setGroupGuiaEnabled(groupId, enabled)` y mapeo en `src/admin/group_service.ts`.
- [x] Actualizar `firestore.rules` con permisos de lectura/escritura para `/groups/{groupId}/trips/{tripId}`.
- [x] Escribir pruebas unitarias para `GroupService` verificando la persistencia y toggle de `guia_enabled`.

## 3. Fase de Panel de Administración (Toggle por Grupo)
- [x] Añadir botón/switch de activación de GuIA en cada tarjeta de grupo en `src/admin/views/AdminView.ts`.
- [x] Mostrar estado visual claro (`Activado` en verde / `Desactivado` en tono neutro).
- [x] Conectar evento click con `groupService.setGroupGuiaEnabled` con feedback inmediato sin recargas.
- [x] Verificar que sólo los administradores pueden ver y cambiar este toggle.

## 4. Fase de Navegación y UI (FloatingTabBar & Router)
- [x] Añadir pestaña `'guia'` a `FloatingTabId` en `src/ui/components/FloatingTabBar.ts`.
- [x] Añadir propiedad condicional `showGuiaTab?: boolean` en `FloatingTabBarOptions`.
- [x] Renderizar el botón `#nav-btn-guia` entre `#nav-btn-map` y `#nav-btn-chat` cuando `showGuiaTab === true`.
- [x] Asegurar que cuando `showGuiaTab === false`, la barra mantenga exactamente los 3 botones actuales sin cambios de estilo ni espacio residual.
- [x] Actualizar `src/main.ts` para gestionar el estado del grupo activo y evaluar si tiene `guia_enabled`.
- [x] Conectar la navegación a la pestaña `guia` y contemplar fallback a `map` si GuIA se desactiva.

## 5. Fase de Módulo GuIA (Catálogo, Creación y Detalle de Viajes)
- [x] Crear tipos de dominio en `src/guia/types.ts` adaptando los modelos de itinerarios de GuIA.
- [x] Crear `src/guia/guia_service.ts` con métodos de suscripción y persistencia en `/groups/{groupId}/trips`.
- [x] Adaptar el motor de generación determinista de itinerarios de GuIA en `src/guia/generator.ts`.
- [x] Crear la vista `src/guia/views/GuiaView.ts`:
  - [x] Vista catálogo de viajes creados en el grupo.
  - [x] Formulario modal para diseñar un nuevo viaje (destino, fechas de llegada/salida, preferencias de viaje).
  - [x] Vista detallada del viaje con itinerario diario por franjas (mañana, mediodía, tarde, noche) y presupuesto.
  - [x] Acciones de navegación hacia atrás y eliminación de viaje.

## 6. Fase de Pruebas y Validación Determinista (Entorno Local)
- [x] Ejecutar build local de Vite (`npm run build`) y verificar 0 errores TypeScript (✓ built in 2.34s).
- [x] Ejecutar suite de pruebas unitarias (`npm test`) (14 archivos pasados, 83 tests pasados al 100%).
- [ ] Pruebas en el navegador por parte del usuario en su entorno local:
  - [ ] Con grupo con GuIA desactivado: la app luce exactamente como hoy (3 pestañas: Mapa, Chat, Perfil).
  - [ ] Activar GuIA desde admin: aparece la pestaña GuIA entre Mapa y Chat.
  - [ ] Crear un viaje en el grupo y comprobar que se visualiza el itinerario.
  - [ ] Desactivar GuIA desde admin: la pestaña desaparece y no hay errores.
- [ ] Esperar visto bueno final del usuario antes de cualquier acción de despliegue o push.
