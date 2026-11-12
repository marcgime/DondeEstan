# Checklist de Implementación: Ajuste de viewport iOS, safe area y glassmorphism en dock

```yaml
change_id: "2026-11-ios-viewport-glassmorphism-dock"
total_tasks: 3
completed_tasks: 3
```

- [x] **T1: Tokens y Utilidades CSS para iOS WebKit**
  - Añadir soporte `-webkit-backdrop-filter` en `src/ui/theme/tokens.css` para el glassmorphism.
  - Asegurar `h-screen-dvh` y reset de altura sin franjas blancas en `html`, `body` y `#app`.
- [x] **T2: Ajuste de Posicionamiento de Navegación y Safe Areas**
  - Ajustar el dock de navegación en `MapView.ts`, `ChatView.ts` y `ProfileView.ts` para que descanse elegantemente sobre la safe area inferior sin elevarse excesivamente ni dejar espacio en blanco.
- [x] **T3: Verificación de Calidad y Tests**
  - Ejecutar tests vitest y gates de arnés (`harness-validator`, `preflight`, `sync-sdd`).
