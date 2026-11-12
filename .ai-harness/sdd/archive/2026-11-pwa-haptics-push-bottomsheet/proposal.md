# Propuesta de Cambio: Experiencia Nativa PWA (Háptica, Bottom Sheet Táctil, Animaciones y Notificaciones)

```yaml
change_id: "2026-11-pwa-haptics-push-bottomsheet"
title: "Experiencia Nativa PWA: Push Notifications, Háptica, Animaciones y Bottom Sheet Táctil"
module: "MOD-ui"
status: CONSOLIDATED
consolidated_at: "2026-11-12"
created_at: "2026-11-12"
author: "Antigravity Pair"
tier: standard
```

---

## 1. Motivación y Contexto

Elevar la experiencia de usuario de DondeEstan para alcanzar calidad nativa en iOS Safari y Android PWA:
- **Feedback Háptico:** Sensación táctil en pulsaciones de botones de navegación, envío de mensajes y centrado de mapa.
- **Bottom Sheet Táctil con Gestos:** Ficha interactiva deslizable hacia arriba (expandida con batería, velocidad, precisión y acción de cómo llegar) o hacia abajo (ocultada).
- **Animaciones Fluidas de Navegación:** Transiciones suaves (*fade/slide*) al alternar entre pestañas (Mapa, Chat, Perfil).
- **Notificaciones Push y Badging:** Base para recepción de mensajes y alertas familiares en segundo plano con contador en el icono de la app.

---

## 2. Delta de Especificación

### Contratos Afectados
- **[+] Añadido:** `CT-UI-05: triggerHapticFeedback` en `src/ui/utils/haptics.ts`
  - Patrones tipados: `light` (10ms), `medium` (20ms), `success` (15ms), `warning` (40ms), `error` (60ms).
- **[+] Añadido:** `CT-LOC-04: renderDraggableBottomSheet` en `src/location/components/DraggableBottomSheet.ts`
  - Soporte de gestos táctiles (`touchstart`, `touchmove`, `touchend`), indicador de arrastre (*drag handle*), telemetría del dispositivo (batería, velocidad, precisión) y botón "¿Cómo llegar?".
- **[+] Añadido:** `CT-CORE-05: updateAppBadge` y gestión de notificaciones en `src/core/pwa.ts`.

### Invariantes y Reglas Afectadas
- **[+] BR-UI-03:** El feedback háptico debe comprobar preventivamente `'vibrate' in navigator` y fallar silenciosamente sin bloquear navegadores de escritorio.
- **[+] BR-LOC-05:** El bottom sheet debe cerrarse al arrastrar hacia abajo pasando el umbral del 40% de su altura.

---

## 3. Casos Límite y Compatibilidad
- En navegadores sin soporte táctil (escritorio), el bottom sheet cuenta con botón de cierre explícito y controles de acción clicables.
- Las animaciones respetan `prefers-reduced-motion` para garantizar accesibilidad WCAG.
