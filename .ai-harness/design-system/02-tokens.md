# 02 — Tokens

Semántica y reglas de uso de los tokens. **Este documento no contiene valores**:
los valores viven en `tokens.json`.

---

## 1. Convención de nombres

```
<grupo>.<subgrupo>.<rol>
```

Ejemplos: `color.text.primary`, `space.md`, `radius.lg`, `type.body.size`.

Reglas:

- `kebab-case` dentro de cada segmento (`color.surface.ambient-start`).
- El nombre describe el **rol**, no el valor (`primary`, no `blue500`).
- Un token nuevo no puede duplicar el rol de otro existente.
- Prohibido renombrar un token sin actualizar `06-code-mapping.md` y el tema.

## 2. Grupos

| Grupo | Contiene | No contiene |
|---|---|---|
| `color` | Superficies, texto, bordes, acento, estado | Valores sueltos sin rol |
| `type` | Familia, escala, pesos, interlineado | Tamaños usados una sola vez |
| `space` | Escala de separación | Márgenes de una pantalla concreta |
| `radius` | Radios por rol | Radios arbitrarios |
| `motion` | Duraciones y curvas | Animaciones concretas |
| `layout` | Breakpoints, anchos máximos, márgenes seguros | Medidas de un widget |
| `elevation` | Sombras por nivel | Sombras decorativas |

## 3. Reglas de cambio

1. Añadir un token: cambio **menor** si no rompe consumidores.
2. Cambiar un valor existente: cambio **mayor**; requiere revisar contraste y
   snapshots visuales.
3. Eliminar un token: solo cuando ningún consumidor lo referencia.
4. Todo cambio actualiza `tokens.json`, el tema del código y la tabla de
   versiones de `README.md` en el mismo commit.

## 4. Paridad con el código

- El tema del código se genera o se escribe a partir de `tokens.json`.
- Un test compara ambos: un token sin reflejo en el tema rompe la suite.
- Prohibido consumir en el código un valor que no esté en `tokens.json`.

## 5. Anti-patrones

- `Color(0xFF...)` en un widget.
- `fontSize: 17` fuera de la escala.
- Un color de marca para decorar en lugar de para accionar.
- Duplicar el mismo valor en dos tokens con nombres distintos.
