# Plataformas y matriz de soporte

Qué plataformas se soportan, con qué entrada se usan y qué restricciones
imponen al diseño.

---

## 1. Matriz

| Plataforma | Entrada principal | Restricciones relevantes |
|---|---|---|
| `<plataforma A>` | `<teclado / táctil / D-Pad>` | `<memoria, permisos, ciclo de vida>` |
| `<plataforma B>` | `<...>` | `<...>` |
| `<plataforma C>` | `<...>` | `<...>` |

Al copiar la plantilla, esta tabla debe describir plataformas reales del
producto, no genéricas.

## 2. Reglas transversales

- Toda funcionalidad declara en qué plataformas aplica.
- Una funcionalidad que no aplique en una plataforma debe degradar de forma
  explícita, no romper.
- Prohibido asumir que una capacidad existe: se comprueba en tiempo de ejecución.
- Los recursos se dimensionan para la plataforma con menos memoria disponible.

## 3. Entrada y accesibilidad

- Toda acción es alcanzable con teclado o D-Pad, además de ratón o táctil.
- El foco es visible y persistente.
- Prohibido depender de hover o de gestos no descubribles.
- Las áreas táctiles respetan el tamaño mínimo declarado en el sistema de diseño.

## 4. Recursos

| Recurso | Regla |
|---|---|
| Memoria | Toda caché declara límite y evicción |
| Almacenamiento | Prohibido crecer sin límite; se define retención |
| Red | Solo conexiones declaradas; reintentos con retroceso |
| Batería | Prohibido trabajo periódico sin justificación |

## 5. Códecs y formatos

Si el producto procesa medios o documentos:

- Se declara la lista de formatos soportados por plataforma.
- Un formato no soportado se informa al usuario; no se convierte en silencio.
- La decodificación por hardware se prefiere cuando está disponible.
- Todo formato nuevo requiere prueba en cada plataforma declarada.

Si el producto no procesa medios, esta sección se declara como no aplicable.

## 6. Verificación por plataforma

| Comprobación | Cómo |
|---|---|
| Arranque correcto | Ejecución en cada plataforma soportada |
| Entrada completa | Recorrido de foco de extremo a extremo |
| Degradación | Prueba con capacidad ausente simulada |
| Recursos | Medición de memoria y almacenamiento en sesión larga |

## 7. Prohibiciones

- Añadir una plataforma sin actualizar esta matriz.
- Usar una API exclusiva de una plataforma en la capa de dominio.
- Declarar soporte sin haber ejecutado la verificación correspondiente.
