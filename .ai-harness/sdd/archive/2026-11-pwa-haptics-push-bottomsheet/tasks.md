# Tareas de Implementación: Experiencia Nativa PWA (Háptica, Bottom Sheet, Animaciones y Badging)

```yaml
change_id: "2026-11-pwa-haptics-push-bottomsheet"
status: COMPLETED
```

---

## 1. Feedback Háptico (`src/ui/utils/haptics.ts`)
- [x] 1.1 Implementar `triggerHapticFeedback(pattern)` con detección preventiva de soporte.
- [x] 1.2 Pruebas unitarias de háptica (`tests/unit/ui/haptics.test.ts`).
- [x] 1.3 Conectar vibración en cambio de pestañas, envío de mensajes de chat y recentrado.

## 2. Bottom Sheet Táctil Deslizable (`src/location/components/DraggableBottomSheet.ts`)
- [x] 2.1 Crear componente con gestos táctiles (*drag handle*, arrastre, snapping peek/expanded/dismissed).
- [x] 2.2 Integrar indicador de batería estimada, precisión en metros, velocidad y botón "¿Cómo llegar?".
- [x] 2.3 Conectar el nuevo Bottom Sheet en `MapView.ts` reemplazando la tarjeta estática previa.

## 3. Animaciones y Badging de la App (`src/ui/` & `src/core/pwa.ts`)
- [x] 3.1 Añadir clases CSS de transición suave en `src/ui/theme/tokens.css`.
- [x] 3.2 Implementar `updateAppBadge(count)` y `clearAppBadge()` en `src/core/pwa.ts`.
- [x] 3.3 Integrar transiciones fluidas en `src/main.ts` al alternar entre pestañas.

## 4. Calidad y Validación
- [x] 4.1 Ejecutar suite completa de tests (`npm test`).
- [x] 4.2 Compilar proyecto (`npm run build`).
- [x] 4.3 Validadores del arnés (`harness-validator`, `preflight`, `sync-sdd`).
