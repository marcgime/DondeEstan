# Tareas de Implementación: Fase 5 — Service Worker PWA Offline, Soporte iOS y Pulido Estético Stitch

```yaml
change_id: "2026-11-fase5-pwa-offline-ios"
status: COMPLETED
```

---

## 1. Módulo PWA y Service Worker (`public/sw.js` & `src/core/pwa.ts`)
- [x] 1.1 Crear el Service Worker nativo `public/sw.js` con cache-first para shell estático y bypass para APIs en tiempo real.
- [x] 1.2 Implementar utilidades PWA en `src/core/pwa.ts` (registro de SW, detector de modo standalone y detector de iOS).
- [x] 1.3 Pruebas unitarias de detección PWA (`tests/unit/core/pwa.test.ts`).

## 2. Componente de Instalación en iOS (`src/ui/components/PwaInstallPrompt.ts`)
- [x] 2.1 Crear banner didáctico para iPhone con instrucción de "Añadir a pantalla de inicio".
- [x] 2.2 Integrar el prompt condicional en `src/main.ts` sin bloquear la interacción con el mapa.

## 3. Pulido Visual y Safe Areas (`src/ui/` & `index.html`)
- [x] 3.1 Revisar viewport-fit=cover y tokens de color en `index.html` y `manifest.json`.
- [x] 3.2 Verificar padding seguro para Dynamic Island y Home Indicator en todos los docks.

## 4. Calidad y Verificación
- [x] 4.1 Ejecutar suite de pruebas unitarias (`npm test`).
- [x] 4.2 Compilar proyecto (`npm run build`).
- [x] 4.3 Ejecutar validadores del arnés (`harness-validator`, `preflight`, `sync-sdd`).
