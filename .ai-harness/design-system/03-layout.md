# 03 — Layout

Breakpoints, rejilla, márgenes seguros y comportamiento del scroll con foco.

---

## 1. Breakpoints

| Nombre | Rango | Uso |
|---|---|---|
| `compact` | < 600 px | Móvil vertical |
| `medium` | 600–1024 px | Tableta, móvil horizontal |
| `expanded` | 1024–1440 px | Escritorio |
| `large` | > 1440 px | Pantalla grande o TV |

Los valores exactos se declaran en `layout.breakpoints` de `tokens.json`.

Reglas:

- El layout se adapta por **contenedor**, no por dispositivo.
- Un cambio de breakpoint no altera el modelo de navegación.
- Prohibido duplicar una pantalla por cada breakpoint.

## 2. Rejilla y espaciado

- Rejilla de 4 u 8 px; todo espacio es múltiplo de la unidad base.
- Márgenes laterales mínimos por breakpoint en `layout.gutters`.
- Ancho máximo de contenido para evitar líneas ilegibles.
- El espaciado se expresa con la escala `space.*`, nunca con literales.

## 3. Área segura

- En TV, respetar `layout.safeArea` para evitar recortes por overscan.
- En móvil, respetar notch y barras del sistema.
- Ningún control interactivo se coloca en el borde del área segura.

## 4. Scroll y foco

- El contenedor con foco desplaza la vista para mantener visible el elemento activo.
- Prohibido el scroll anidado en dos ejes.
- El foco no puede quedar fuera del área visible.
- Al cambiar de vista, el foco se restaura al elemento de origen.

## 5. Plantillas de página

| Plantilla | Estructura |
|---|---|
| `single` | Cabecera + contenido |
| `list-detail` | Lista navegable + detalle |
| `hub` | Carruseles o secciones apiladas |
| `immersive` | Contenido a pantalla completa con controles superpuestos |

Cada pantalla declara su plantilla en `05-pages.md`; no se improvisa.

## 6. Densidad

- `comfortable` por defecto.
- `compact` solo en listas largas con navegación por foco.
- La densidad cambia el espaciado, nunca el tamaño del texto por debajo del mínimo.
