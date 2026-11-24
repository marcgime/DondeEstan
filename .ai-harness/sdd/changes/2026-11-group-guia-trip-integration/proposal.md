# Propuesta de Cambio: Integración de GuIA por Grupo y Pestaña de Viajes Condicional

```yaml
change_id: "2026-11-group-guia-trip-integration"
title: "Integración de GuIA por Grupo y Pestaña de Viajes Condicional"
module: "MOD-admin"               # Módulos afectados: MOD-admin, MOD-ui, MOD-core, MOD-guia
status: IMPLEMENTING                    # PROPOSED | APPROVED | IMPLEMENTING | CONSOLIDATED
created_at: "2026-11-24"
author: "Antigravity"
tier: standard                      # fast_path | standard | core
```

---

## 1. Motivación y Contexto

Actualmente, `DondeEstan` permite a los miembros de una familia o grupo de amigos compartir su ubicación en tiempo real en un mapa y comunicarse a través de un chat grupal segmentado por grupos (`groups/{groupId}`).
Por otro lado, la aplicación `GuIA` está diseñada para generar, visualizar y gestionar itinerarios de viaje personalizados (con plan diario por franjas horarias, presupuesto y bitácora).

Se requiere integrar la experiencia de viaje de `GuIA` dentro de `DondeEstan` respetando las siguientes directrices clave:
1. **Segmentación por Grupo:** Cada grupo creado en `DondeEstan` tendrá su propio espacio de viajes e itinerarios compartidos.
2. **Interruptor Administrativo por Grupo:** Desde el panel de administración (`AdminView`), en el listado de grupos creados, el administrador podrá habilitar o inhabilitar la funcionalidad de `GuIA` para cada grupo de forma individual (`guia_enabled: boolean`).
3. **Visibilidad Condicional Estricta:** Si un grupo **no** tiene habilitado `GuIA` (estado por defecto), la aplicación se presentará exactamente como se ve a día de hoy, manteniendo las tres pestañas tradicionales en la barra inferior (`Mapa`, `Chat`, `Perfil`).
4. **Nueva Pestaña de Navegación `GuIA`:** Cuando el grupo seleccionado tenga habilitado `GuIA`, la barra de navegación inferior (`FloatingTabBar`) incorporará una nueva pestaña situada exactamente entre `Mapa` y `Chat`, con el nombre `GuIA`:
   `[ 🗺️ Mapa ]  [ 🧭 GuIA ]  [ 💬 Chat ]  [ 👤 Perfil ]`
5. **Aislamiento en Producción:** Todos los cambios se mantendrán en local para pruebas y verificación rigurosa, sin publicar a GitHub ni a Cloudflare Workers hasta contar con la aprobación expresa del usuario.

---

## 2. Delta de Especificación

### Contratos Afectados

#### [~] Modificado: `CT-GRP-01` en `src/admin/types.ts`
Se amplía la interfaz de `Group` con el flag opcional de activación de GuIA:
```typescript
export interface Group {
  id: string;
  name: string;
  created_at: number;
  created_by: string;
  guia_enabled?: boolean; // Nuevo: Habilita el módulo de GuIA para los miembros de este grupo
}
```

#### [~] Modificado: `CT-GRP-02` en `src/admin/group_service.ts`
- Se actualiza `subscribeToGroups` para mapear `guia_enabled: Boolean(data.guia_enabled)`.
- Se añade el método:
  ```typescript
  async setGroupGuiaEnabled(groupId: string, enabled: boolean): Promise<void>
  ```
  Permite al administrador conmutar el estado del módulo GuIA en el documento `groups/{groupId}`.

#### [~] Modificado: `CT-UI-06` en `src/ui/components/FloatingTabBar.ts`
- Se amplía el tipo de pestaña activa:
  ```typescript
  export type FloatingTabId = 'map' | 'guia' | 'chat' | 'profile';
  ```
- Se añade la opción condicional en `FloatingTabBarOptions`:
  ```typescript
  export interface FloatingTabBarOptions {
    activeTab: FloatingTabId;
    showGuiaTab?: boolean; // Si es true, se renderiza la pestaña GuIA entre Mapa y Chat
    onNavigateTab?: (tab: FloatingTabId) => void;
    onActiveTabClick?: () => void;
    inactivityMs?: number;
    zIndexClass?: string;
  }
  ```
- Cuando `showGuiaTab` es `false` o no está definido, el DOM del dock contiene exactamente los 3 botones actuales (`Mapa`, `Chat`, `Perfil`) con el mismo layout y dimensiones exactas.
- Cuando `showGuiaTab` es `true`, se añade el botón `#nav-btn-guia` entre `#nav-btn-map` y `#nav-btn-chat` con icono temático de viaje/itinerario y etiqueta `GuIA`.

#### [+] Añadido: `CT-GUIA-01` en `src/guia/types.ts`
Modelos de dominio adaptados para viajes compartidos en grupo:
```typescript
export interface GroupItineraryMetadata {
  destino: string;
  alojamiento_ubicacion: string;
  fecha_llegada: string;
  fecha_salida: string;
  duracion_dias: number;
  resumen_estilo: string;
  imagen_url?: string;
  presupuesto_estimado_por_persona?: number;
  created_by: string;
  created_by_name: string;
}

export interface GroupTimeSlotActivity {
  actividades: string;
  logistica_transporte: string;
  sugerencia_gastronomica: string;
}

export interface GroupDayPlan {
  dia_numero: number;
  fecha: string;
  descripcion_general_dia: string;
  franjas: {
    manana?: GroupTimeSlotActivity | null;
    medio_dia?: GroupTimeSlotActivity | null;
    tarde?: GroupTimeSlotActivity | null;
    noche?: GroupTimeSlotActivity | null;
  };
}

export interface GroupTrip {
  id: string;
  groupId: string;
  metadatos: GroupItineraryMetadata;
  plan_diario: GroupDayPlan[];
  created_at: number;
}
```

#### [+] Añadido: `CT-GUIA-02` en `src/guia/guia_service.ts`
Servicio para gestionar la persistencia y suscripción en tiempo real de viajes en Firestore:
- `subscribeToGroupTrips(groupId: string, onTrips: (trips: GroupTrip[]) => void): Unsubscribe`
- `createTrip(groupId: string, trip: Omit<GroupTrip, 'id' | 'created_at'>): Promise<string>`
- `deleteTrip(groupId: string, tripId: string): Promise<void>`

#### [+] Añadido: `CT-GUIA-03` en `src/guia/views/GuiaView.ts`
Vista interactiva que se renderiza cuando `currentTab === 'guia'`:
- Encabezado con selector/indicador del grupo activo.
- Catálogo de viajes del grupo (tarjetas con imagen, fechas, duración, presupuesto y botón de detalle).
- Modal / formulario para diseñar un nuevo viaje (destino, fechas con rango, estilo y preferencias adaptadas del generador determinista/IA de `GuIA`).
- Pantalla de visualización detallada del itinerario diario por franjas horarias (mañana, mediodía, tarde, noche).
- Botón de retorno al catálogo de viajes.

#### [~] Modificado: `Main Navigation` en `src/main.ts`
- Gestión del estado del grupo activo y detección de `guia_enabled`.
- Inclusión del caso `currentTab === 'guia'` invocando `renderGuiaView(...)`.
- Paso de `showGuiaTab: isGuiaEnabledForActiveGroup` al `FloatingTabBar`.

#### [~] Modificado: `AdminView` en `src/admin/views/AdminView.ts`
- En el bloque `renderGroupsList()`, cada fila de grupo incorpora un control tipo interruptor / toggle accesible:
  - Etiqueta: `GuIA: Activado` (estilo `bg-status-online`) / `GuIA: Desactivado` (estilo `bg-surface-elevated`).
  - Al hacer clic, invoca de inmediato `groupService.setGroupGuiaEnabled(group.id, !group.guia_enabled)`.

#### [~] Modificado: `firestore.rules`
Se añaden permisos para la subcolección de viajes bajo cada grupo:
```rules
match /groups/{groupId} {
  allow read: if isActiveMember() || isAdmin();
  allow write: if isAdmin();

  match /messages/{messageId} {
    allow read, create: if isActiveMember() || isAdmin();
    allow update: if false;
    allow delete: if isAdmin();
  }

  // Subcolección de viajes compartidos de GuIA
  match /trips/{tripId} {
    allow read, create, update: if isActiveMember() || isAdmin();
    allow delete: if isActiveMember() || isAdmin();
  }
}
```

---

## 3. Invariantes y Reglas de Negocio (BR-*)

- **BR-GUIA-01 (Inactivo por defecto):** Todo grupo nuevo o preexistente en Firestore que carezca del campo `guia_enabled` se considerará inactivo (`guia_enabled === false`).
- **BR-GUIA-02 (Cero regresión visual):** Si el grupo activo no tiene habilitado `GuIA`, la interfaz no mostrará ningún elemento, botón ni espacio residual del módulo; el dock flotante mantendrá su configuración de 3 botones idéntica a producción.
- **BR-GUIA-03 (Pertenencia y aislamiento):** Los viajes pertenecen a `groups/{groupId}/trips` y solo pueden ser consultados y editados por miembros autorizados de dicho grupo o por el administrador.
- **BR-GUIA-04 (Fallback seguro):** Si un usuario se encuentra en la pestaña `GuIA` y el administrador desactiva el módulo en tiempo real (o el usuario cambia a un grupo que no lo tiene habilitado), la interfaz conmuta automáticamente y sin errores a la pestaña `map`.
- **BR-GUIA-05 (Orden estricto de navegación):** La pestaña `GuIA` se sitúa exclusivamente en la segunda posición (entre `Mapa` y `Chat`), preservando el atajo háptico y el auto-compactado a los 4 segundos de inactividad (`DS-NAV-DOCK`).

---

## 4. Casos Límite y Compatibilidad Hacia Atrás

- **¿Rompe consumidores existentes?** No. Los contratos de `Group`, `FloatingTabBar` y `AdminService` son retrocompatibles. Los parámetros nuevos son opcionales (`guia_enabled?: boolean`, `showGuiaTab?: boolean`).
- **¿Afecta a datos existentes?** No. No se alteran ni eliminan campos preexistentes de grupos ni usuarios en Firestore.
- **¿Qué ocurre si el usuario tiene asignados varios grupos y solo uno tiene GuIA activo?**
  Al seleccionar dicho grupo en el desplegable de grupos, la pestaña `GuIA` aparece en el dock; al seleccionar un grupo sin GuIA, la pestaña desaparece dinámicamente. Si se selecciona la vista `"Todos"`, se evalúa si al menos uno de sus grupos asignados tiene GuIA para ofrecer el selector contextual de viajes.
- **Generación de itinerarios:** Se utiliza el motor determinista de planificación de `GuIA` adaptado para ejecutarse en el navegador con opción de guardar directamente en Firestore.
- **Garantía de No-Despliegue:** No se ejecutarán comandos `git push`, ni despliegues con `wrangler deploy` o `firebase deploy` hasta que el usuario pruebe la funcionalidad en local y dé su aprobación formal.
