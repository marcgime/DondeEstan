# Sistema de diseño — índice normativo

Punto de entrada al sistema de diseño. Conserva las reglas transversales y
enruta al detalle en `.ai-harness/design-system/`.

---

## 1. Autoridad

| Nivel | Archivo | Contiene |
|---|---|---|
| Valores | `design-system/tokens.json` | Únicos valores canónicos |
| Semántica | `design-system/01-foundations.md` y `02-tokens.md` | Rol y uso, sin valores |
| Estructura | `design-system/03-layout.md` | Breakpoints, rejilla, área segura |
| Inventario | `design-system/04-components.md` | Componentes `DS-*` y sus estados |
| Pantallas | `design-system/05-pages.md` | Blueprint funcional por página |
| Código | `design-system/06-code-mapping.md` | Token → clase → widget → spec → test |

Este documento no repite valores ni anatomías: enruta.

## 2. Reglas duras

1. Prohibido escribir colores, tamaños o tipografías literales fuera de la capa
   de tema. `preflight` lo bloquea.
2. Un token que no existe en `tokens.json` no se usa: primero se define.
3. El tema del código y `tokens.json` deben coincidir exactamente.
4. El foco es comportamiento: todo control es navegable y visible al enfocarse.
5. Las specs de capa `ui` declaran `design_ref: .ai-harness/context/ui-design-system.md`.
6. Los tokens se referencian por nombre, nunca por valor.
7. Ningún cambio visual entra sin actualizar tokens, tema, mapeo y versión.

## 3. Foco y entrada

- Todo elemento interactivo es alcanzable con teclado (Tab/Shift+Tab) o interacción táctil/ratón según WCAG AA.
- El foco nunca queda atrapado ni se pierde al cambiar de vista.
- El estado de foco es visible sin depender de hover.
- El orden de foco sigue el orden visual.

## 4. Accesibilidad

- Contraste mínimo AA en texto y en iconos con significado.
- El color nunca es el único portador de información.
- Todo control tiene etiqueta accesible y estado anunciado.
- Las animaciones respetan la preferencia de movimiento reducido.

## 5. Proceso de cambio

1. Se propone el cambio con su motivación.
2. Se actualiza `tokens.json` (valores) y `02-tokens.md` (semántica) si aplica.
3. Se actualiza el tema del código.
4. Se actualiza `06-code-mapping.md`.
5. Se ejecutan tests de paridad y contraste.
6. Se incrementa la versión del sistema según el tipo de cambio.

## 6. Validación

- `preflight` bloquea valores literales y dependencias de UI no declaradas.
- El test de paridad compara tokens y tema.
- `sync-sdd` verifica que las specs de UI apuntan a targets reales.

## 7. Prohibiciones

- Duplicar valores en documentos o en specs.
- Introducir un componente sin ficha en `04-components.md`.
- Cambiar un valor sin revisar contraste.
- Crear variantes visuales que no estén en el inventario.
