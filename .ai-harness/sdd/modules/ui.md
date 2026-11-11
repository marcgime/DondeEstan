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

---

## 3. Reglas de Negocio e Invariantes (BR-*)

- **BR-UI-01:** Prohibido el uso de estilos HEX o tamaños en píxeles no declarados en `tokens.json`.
- **BR-UI-02:** Los componentes deben ser 100% accesibles con contraste AA verificado.

---

## 4. Mapa de implementación

| Contrato / Flujo | Símbolo de Código | Ruta en Disco | Pruebas Unitarias |
|---|---|---|---|
| CT-UI-01 | `KineticBloomTokens` | `src/ui/theme/tokens.css` | `tests/unit/auth/gatekeeper.test.ts` |
| CT-UI-02 | `renderGatekeeperScreen` | `src/ui/components/GatekeeperScreen.ts` | `tests/unit/auth/gatekeeper.test.ts` |
