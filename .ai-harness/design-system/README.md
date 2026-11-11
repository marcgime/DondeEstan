# Sistema de diseño

> Autoridad de diseño del proyecto. Define fundamentos, tokens, layout,
> componentes y su correspondencia con el código.

---

## 1. Qué es y qué no es

Este directorio es el **detalle normativo** del sistema de diseño.
`context/ui-design-system.md` es el **índice normativo** que enruta aquí y
conserva las reglas transversales.

- `tokens.json` es la **única fuente de valores** (color, tipografía, espacio,
  radios, movimiento, layout).
- `02-tokens.md` define **semántica y uso**, nunca valores.
- Las specs de UI referencian tokens **por nombre**; nunca copian HEX ni tamaños.
- El código de producción materializa estos tokens en la capa de tema.

Este sistema **no** define comportamiento de producto ni contratos de datos.

---

## 2. Orden de lectura

| # | Archivo | Responde a |
|---|---|---|
| 1 | `01-foundations.md` | Identidad, color, tipografía, forma, foco, movimiento y accesibilidad |
| 2 | `02-tokens.md` | Convención de nombres, rol de cada token y reglas de cambio |
| 3 | `tokens.json` | Valores canónicos machine-readable |
| 4 | `03-layout.md` | Breakpoints, rejilla, márgenes seguros y scroll con foco |
| 5 | `04-components.md` | Inventario `DS-*`: anatomía, estados y comportamiento |
| 6 | `05-pages.md` | Blueprint funcional de cada pantalla |
| 7 | `06-code-mapping.md` | Token → clase → widget → spec → test |

---

## 3. Reglas duras

1. **Prohibido** escribir colores o tamaños literales fuera de la capa de tema.
   `preflight` lo bloquea (`UI-HARDCODED-COLOR`).
2. Un token que no existe en `tokens.json` **no se usa**: primero se añade al
   sistema, después al código.
3. Los valores de `tokens.json` y el tema del código deben coincidir
   exactamente; un test de paridad lo verifica.
4. El foco es comportamiento, no decoración: todo control tiene estado de foco
   visible y navegable con teclado o Teclado y Táctil.
5. Las specs de UI declaran `design_ref: .ai-harness/context/ui-design-system.md`
   y referencian tokens por nombre.
6. Este árbol no duplica reglas de producto ni contratos de datos.
7. Ningún cambio visual entra sin actualizar `tokens.json`, el tema, el mapeo de
   código y la versión del sistema.

---

## 4. Versionado

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0.0 | `<YYYY-MM-DD>` | Nace el sistema: fundamentos, tokens, layout, componentes, páginas y mapeo. |

Mayor: altera valores existentes. Menor: añade tokens sin romper. Parche:
corrige documentación sin cambiar valores.

---

## 5. Validación

- `python .ai-harness/skills/harness-validator/runner.py` — integridad del arnés.
- `python .ai-harness/skills/preflight/runner.py` — disciplina de tokens en el código.
- Test de paridad `tokens.json` ↔ tema del código.
- `python .ai-harness/skills/sync-sdd/runner.py` — deriva spec ↔ código.

Un fallo de validación se corrige en la causa raíz; no se silencia.
