# Estándares de código

Reglas de estilo, diseño de tipos y manejo de errores. El objetivo no es el
gusto personal: es que dos personas escriban el mismo código sin negociarlo.

---

## 1. Estilo

- Formateador automático obligatorio; el código sin formatear no se acepta.
- Análisis estático sin errores ni warnings nuevos.
- Nombres descriptivos; prohibidas las abreviaturas opacas.
- Un archivo, una responsabilidad.
- Funciones cortas: si necesita un comentario para explicar qué hace un bloque,
  probablemente ese bloque merece un nombre.

## 2. Tipos

- Prohibido usar tipos dinámicos en contratos públicos.
- Los DTOs son inmutables una vez construidos.
- Los valores opcionales se representan con nulabilidad explícita, no con
  centinelas (`-1`, `""`, `0`).
- Los estados se modelan con tipos cerrados, no con cadenas libres.
- Los errores forman parte del contrato: se declaran, no se lanzan a ciegas.

## 3. Composición y dependencias

- Inyección de dependencias por constructor.
- Prohibido el estado global mutable.
- Prohibidos los singletons ocultos dentro de widgets.
- Una dependencia externa se encapsula detrás de un contrato propio.
- Toda dependencia nueva se justifica con un ADR.

## 4. Errores y resultados

- Un error esperado se devuelve como resultado tipado, no como excepción.
- Una excepción se reserva para lo verdaderamente excepcional.
- Prohibido capturar y descartar un error sin registro ni transformación.
- Los mensajes de error indican causa y acción; nunca incluyen datos sensibles.
- Todo error relevante tiene al menos un test que lo provoca.

## 5. Asincronía

- Prohibido bloquear el hilo de interfaz.
- Toda operación asíncrona es cancelable cuando puede serlo.
- Los recursos se liberan en un bloque de finalización, incluso si hay error.
- Prohibido el `sleep` para sincronizar: se usan señales o completions.

## 6. Documentación en código

- Todo símbolo público implementado lleva comentario de trazabilidad:
  `/// Spec: <ID> / <FR|ST>`.
- El comentario explica el contrato y los efectos, no repite el nombre.
- Prohibidos los comentarios obsoletos: se corrigen o se borran.

## 7. Localización

- Ningún texto visible se escribe literal en la vista.
- Los textos viven en recursos de localización con claves estables.
- Las fechas, números y monedas se formatean según configuración regional.
- Prohibido concatenar fragmentos traducibles.

## 8. Prohibiciones

- Valores visuales literales fuera de la capa de tema.
- Código comentado sin justificación.
- Dependencias sin ADR.
- Importaciones circulares.
- `catch` vacío.
- Lógica de negocio en widgets o en el punto de entrada.
