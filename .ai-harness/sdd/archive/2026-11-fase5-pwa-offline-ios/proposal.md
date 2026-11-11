# Propuesta de Cambio: Fase 5 — Service Worker PWA Offline, Soporte iOS y Pulido Estético Stitch

```yaml
change_id: "2026-11-fase5-pwa-offline-ios"
title: "Fase 5 — Service Worker PWA Offline, Soporte iOS y Pulido Estético Stitch"
module: "MOD-ui"
status: CONSOLIDATED
consolidated_at: "2026-11-11"
created_at: "2026-11-11"
author: "Antigravity Pair"
tier: standard
```

---

## 1. Motivación y Contexto

Para que la aplicación funcione como una PWA de grado nativo en iPhone iOS Safari:
- Debe permitir carga instantánea y funcionamiento offline de la shell mediante un Service Worker.
- Debe ofrecer una indicación clara para añadir a la pantalla de inicio cuando se navegue en Safari móvil.
- Debe garantizar perfecta adaptación a las safe areas (Dynamic Island y Home Indicator) según las especificaciones del diseño Stitch.

---

## 2. Delta de Especificación

### Contratos Afectados
- **[+] Añadido:** `CT-UI-03: PwaService` en `src/core/pwa.ts` para registro del Service Worker y detección de modo standalone / iOS.
- **[+] Añadido:** `CT-UI-04: renderPwaInstallPrompt` en `src/ui/components/PwaInstallPrompt.ts` para banner didáctico iOS.
- **[+] Añadido:** `Service Worker (sw.js)` en `public/sw.js` con cache-first para shell e inmunidad para endpoints de Firestore y Auth.

### Invariantes y Reglas Afectadas
- **[+] BR-PWA-01:** La aplicación debe registrar un Service Worker en modo producción sin bloquear el arranque.
- **[+] BR-PWA-02:** Los endpoints de Firebase Firestore y Google Maps no deben cachearse de forma estática destructiva para mantener la frescura de datos en tiempo real.
- **[+] BR-PWA-03:** El prompt de instalación solo debe mostrarse en iOS Safari cuando la app no esté ya instalada como standalone.

---

## 3. Casos Límite y Compatibilidad
- En modo desarrollo (`localhost`), el Service Worker no interfiere con el Hot Module Replacement (HMR).
- En caso de desconexión completa de red, la interfaz muestra el estado offline sin pantallazos de error no controlados.
