# 04 — Componentes Visuales del Sistema (`DS-*`)

Inventario canónico de componentes reutilizables de DondeEstan.
Cada componente define propósito, anatomía, estados y tokens consumidos.

---

## 1. Convención de Identificadores

```
DS-<ÁMBITO>-<NOMBRE>
```

Ámbitos: `LAYOUT` (estructura), `NAV` (navegación), `INPUT` (acciones y formularios),
`FEEDBACK` (alertas, loaders, estados vacíos), `DATA` (métricas, tablas, feeds).

---

## 2. Inventario de Componentes Canónicos

| ID | Nombre / Propósito | Ámbito | Estados |
|---|---|---|---|
| `DS-LAYOUT-SHELL` | Shell de la aplicación con soporte para Dynamic Island y safe-areas iOS | Interfaz interactiva adaptada | `default`, `active` |
| `DS-NAV-DOCK` | Dock de navegación flotante glassmorphic (backdrop-filter: blur(24px)) con indicador deslizante | Interfaz interactiva adaptada | `default`, `active` |
| `DS-MAP-MARKER` | Marcador de avatar con halo pulsante (verde online, gris offline) | Interfaz interactiva adaptada | `default`, `active` |
| `DS-LOCATION-CARD` | Bottom sheet táctil con tiempo relativo, estado y acciones de centrado | Interfaz interactiva adaptada | `default`, `active` |
| `DS-CHAT-MESSAGE` | Burbuja de chat reactiva con avatar y timestamp | Interfaz interactiva adaptada | `default`, `active` |
| `DS-GATE-LOCKED` | Vista de espera y bloqueo para usuarios en estado pending_approval | Interfaz interactiva adaptada | `default`, `active` |
| `DS-ADMIN-SWITCH` | Control switch reactivo para abrir o cerrar registros (registration_open) | Interfaz interactiva adaptada | `default`, `active` |
| `DS-ADMIN-MEMBER-ROW` | Fila de administración de miembro con opciones de aprobación, rechazo y purga total | Interfaz interactiva adaptada | `default`, `active` |

---

## 3. Reglas de Construcción

1. **Aislamiento Funcional:** Los componentes `DS-*` no contienen lógica de red ni acceso directo a bases de datos; reciben datos y eventos vía propiedades/atributos.
2. **Accesibilidad Obligatoria:** Todo control interactivo (`BUTTON`, `SWITCH`) cuenta con atributos `aria-label`, foco visible con outline nítido y ratio de contraste mínimo 4.5:1 (WCAG AA).
