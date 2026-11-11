# 01 — Fundamentos

Principios visuales que no dependen de ningún valor concreto. Los valores están
en `tokens.json`; aquí se explica **qué significa cada rol**.

---

## 1. Principios

1. **Contraste antes que estética:** todo texto cumple AA sobre su superficie.
2. **Jerarquía por escala, no por color:** el tamaño y el peso ordenan la lectura.
3. **Superficies en capas:** base, elevada e interna. Nada flota sin motivo.
4. **Un solo acento:** el color de marca se reserva para acción y foco.
5. **Movimiento con propósito:** transiciones cortas para indicar cambio de estado.
6. **Foco siempre visible:** requisito funcional, no adorno.

## 2. Color

El color se usa por **rol semántico**, nunca por valor:

| Rol | Uso |
|---|---|
| `color.surface.canvas` | Fondo de la aplicación |
| `color.surface.base` | Contenedor de contenido |
| `color.surface.elevated` | Elementos que se superponen |
| `color.text.primary` | Texto principal |
| `color.text.secondary` | Texto de apoyo |
| `color.text.disabled` | Texto no interactivo |
| `color.accent.base` | Acción principal y foco |
| `color.border.subtle` | Separadores de baja intensidad |
| `color.status.*` | Éxito, aviso, error, información |

Regla: si necesitas un color que no existe como rol, primero se define el rol en
`tokens.json`, después se usa.

## 3. Tipografía

- Una familia principal y, como máximo, una secundaria.
- Escala cerrada: `display`, `title`, `heading`, `body`, `label`, `caption`.
- Interlineado mínimo 1.2 en titulares y 1.4 en cuerpo.
- Prohibido el texto por debajo del tamaño mínimo declarado en `tokens.json`.

## 4. Forma y elevación

- Radios por rol: `sm`, `md`, `lg`, `full`.
- La elevación se expresa con superficie y sombra, no con bordes gruesos.
- Los bordes de foco son siempre del color de acento y visibles sin hover.

## 5. Foco y entrada

- Todo control interactivo es alcanzable con flechas o Teclado y Táctil y activable con
  Enter o Select.
- El estado de foco es persistente mientras el elemento lo tenga.
- El orden de foco sigue el orden visual; nunca se salta ni se atrapa.
- Prohibido depender exclusivamente de hover o gesto táctil.

## 6. Movimiento

- Duración corta para cambios de estado, media para transiciones de vista.
- Toda animación respeta la preferencia de movimiento reducido.
- Prohibidas las animaciones que retrasen la lectura o bloqueen la entrada.

## 7. Accesibilidad

- Contraste mínimo AA en texto y en iconos con significado.
- El color nunca es el único portador de información.
- Los mensajes de error indican qué pasó y qué hacer.
- Los controles tienen etiqueta accesible y estado anunciado.

## 8. Microcopy

- Voz directa, en presente, sin jerga interna.
- Los botones nombran la acción, no "Aceptar" genérico.
- Los estados vacíos explican por qué está vacío y qué se puede hacer.
