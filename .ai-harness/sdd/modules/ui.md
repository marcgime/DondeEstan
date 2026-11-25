# Módulo: Sistema de Interfaz y UI (MOD-ui)

```yaml
module_id: MOD-ui
name: "Componentes Visuales, Sistema de Diseño y Maquetación"
target_path: "src/ui/"
scope: "block_ui.md"
owner: "Design & Frontend Team"
version: "1.0.0"
last_updated: "2026-11-11"
```

---

## 1. Propósito y Responsabilidades

Concentra la experiencia gráfica, los componentes reutilizables, la maquetación y la materialización de los tokens de diseño (`design-system/tokens.json`).

### Lo que hace
- Renderiza componentes respetando estrictamente los tokens del sistema.
- Proporciona accesibilidad WCAG AA y respuesta responsiva.
- Centraliza la navegación y los estados de interacción (carga, vacío, error, éxito).

### Lo que NO hace
- No realiza peticiones directas de red ni persistencia de datos (consume servicios desacoplados).
- No hardcodea colores HEX, tamaños mágicos ni márgenes fuera del sistema de diseño.

---

## 2. Contratos y Tipos Públicos (CT-*)

### CT-01: Tema y Proveedor de Tokens (`ThemeContract`)
- **Símbolo / Archivo:** `src/ui/theme/tokens.ts::ThemeTokens`
- **Invariantes:** Mapeo 1:1 con `design-system/tokens.json`.

### CT-02: Componentes Base Reutilizables (`BaseComponents`)
- **Símbolo / Archivo:** `src/ui/components/base.ts`
- **Invariantes:** Todo componente interactivo expone estados `default`, `hover`, `focus`, `disabled`.

### CT-UI-06: Dock de Navegación Flotante Auto-Compacto (`FloatingTabBar`)
- **Símbolo / Archivo:** `src/ui/components/FloatingTabBar.ts::renderFloatingTabBar`
- **Invariantes:** Se compacta a solo iconos tras `4000ms` de inactividad; al tocarlo se reexpande; libera su timer al desmontarse.

---

## 3. Reglas de Negocio e Invariantes (BR-*)

- **BR-UI-01:** Prohibido el uso de estilos HEX o tamaños en píxeles no declarados en `tokens.json`.
- **BR-UI-02:** Los componentes deben ser 100% accesibles con contraste AA verificado.
- **BR-UI-03:** Escalado proporcional en `rem` desde `html` (`108%` por defecto, configurable en Perfil) y respeto estricto de `safe-area-inset-top` sin difuminado superior en iOS PWA.
- **BR-UI-04:** `DS-NAV-DOCK` oculta las etiquetas textuales tras 4 segundos sin interacción dejando solo los 3 logotipos.
- **BR-UI-05:** El manifiesto PWA (`public/manifest.json`) y las etiquetas de `index.html` declaran `"DondeEstan"` como nombre por defecto al guardar en el escritorio o pantalla de inicio, y utilizan el logotipo oficial como favicon (`/favicon.png`), `apple-touch-icon` (`/icons/apple-touch-icon.png`), iconos PWA (`/icons/icon-192.png`, `/icons/icon-512.png`) y cabecera visual de la app (`AuthView`, `PwaInstallPrompt`).
- **BR-UI-06:** `FloatingTabBar` muestra un globo rojo (`#chat-unread-badge`) con el número de mensajes no leídos sobre la pestaña `Chat` siempre que haya mensajes nuevos pendientes, ocultándolo automáticamente al entrar en la pestaña `Chat`.

---

## 4. Mapa de implementación

| Contrato / Flujo | Símbolo de Código | Ruta en Disco | Pruebas Unitarias |
|---|---|---|---|
| CT-UI-01 | `KineticBloomTokens` | `src/ui/theme/tokens.css` | `tests/unit/auth/gatekeeper.test.ts` |
| CT-UI-02 | `renderGatekeeperScreen` | `src/ui/components/GatekeeperScreen.ts` | `tests/unit/auth/gatekeeper.test.ts` |
| CT-UI-03 | `checkAndRenderIosInstallPrompt` | `src/ui/components/PwaInstallPrompt.ts` | `tests/unit/core/pwa.test.ts` |
| CT-UI-04 | `PwaUtilities` | `src/core/pwa.ts` | `tests/unit/core/pwa.test.ts` |
| CT-UI-05 | `applyUiScale` / `initUiScale` | `src/ui/theme/ui_scale.ts` | `tests/unit/core/pwa.test.ts` |
| CT-UI-06 | `renderFloatingTabBar` | `src/ui/components/FloatingTabBar.ts` | `tests/unit/ui/floating_tab_bar.test.ts` |
| CT-UI-07 | `renderAuthView` | `src/auth/views/AuthView.ts` | `tests/unit/core/pwa.test.ts` |
