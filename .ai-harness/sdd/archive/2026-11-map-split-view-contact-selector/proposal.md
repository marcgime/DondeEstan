# Propuesta de Cambio: Rediseño de vista mapa split con toggle switch y selector interactivo de contactos

```yaml
change_id: "2026-11-map-split-view-contact-selector"
title: "Rediseño de vista mapa split con toggle switch y selector interactivo de contactos"
module: "MOD-location"
status: CONSOLIDATED
consolidated_at: "2026-11-17"
created_at: "2026-11-17"
author: "Antigravity"
tier: standard
```

---

## 1. Motivación y Contexto

Mejorar la usabilidad del mapa en dispositivos móviles (iPhone/Android):
1. **Layout Split:** El mapa pasa a un contenedor superior cuadrado delimitado (`aspect-square` / altura equilibrada), dejando la mitad inferior para un listado scrolleable de familiares registrados.
2. **Toggle Switch de Selección Global:**
   - Si `Mostrar todos` está activado (ON): Se muestran todos los marcadores en el mapa y la lista de contactos es informativa (solo lectura).
   - Si `Mostrar todos` está desactivado (OFF): Cada contacto en la lista actúa como un selector interactivo independiente (toggle). Al tocarlo, se muestra u oculta su marcador específico en el mapa, permitiendo combinaciones múltiples a elección del usuario.
3. **Glassmorphism nativo garantizado:** Asegurar reglas CSS en línea / clases de alta especificidad para `-webkit-backdrop-filter` en los elementos flotantes y el dock inferior.

---

## 2. Delta de Especificación (Cambios sobre MOD-location y MOD-ui)

### Contratos y Métodos
- **[+] Añadido en `MapView`:**
  - Estado `showAll: boolean` (por defecto `true`).
  - Estado `selectedMemberUids: Set<string>` para el modo manual (por defecto contiene al usuario actual o vacío).
  - Componente de lista interactiva de miembros con avatar, nombre, estado online/offline y badge de selección.
  - Switch interactivo para conmutar entre `showAll` y selección individual/múltiple.
- **[~] Modificado en `IMapEngine` / `FamilyMapService` / `LeafletFamilyMapService`:**
  - `updateMembers(members: MemberLocationState[])`: Filtra según los miembros visibles antes de pintar en el mapa.

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- Cuando la lista de miembros está vacía o cargando, se muestran skeletons o feedback visual.
- Al alternar el toggle a ON, se reencuadra o muestran todos los familiares de inmediato.
- Mantiene el bottom sheet modal y centrado por usuario al pulsar sobre sus detalles o marcador.
