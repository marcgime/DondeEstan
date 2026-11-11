# Glosario

Vocabulario compartido. Un término ambiguo genera specs contradictorias, así que
cada palabra con significado de negocio o de arquitectura se define aquí.

---

## 1. Términos de arnés

| Término | Definición |
|---|---|
| **Arnés** | Conjunto de reglas, contexto, specs, memoria y validadores que restringen y guían el trabajo del agente |
| **Contexto** | Documento normativo de `context/`; es la verdad del sistema |
| **Scope** | Límite de escritura de un bloque: qué rutas puede tocar y cuáles no |
| **Spec (Módulo)** | Especificación técnica viva de un módulo (`modules/<slug>.md`) o delta de propuesta (`changes/<id>/proposal.md`) |
| **Delta (Propuesta)** | Propuesta de cambio aislada en `changes/` con `proposal.md` y lista de tareas `tasks.md` |
| **Fast-Path** | Procedimiento ágil para parches y bugfixes menores (<3 archivos) sin spec previa |
| **Trazabilidad** | Cadena `FR/ST → CT → archivo::símbolo → TC` que une requisito, contrato, código y prueba |
| **Modo de fallo** | Error recurrente documentado con síntoma, riesgo, prevención y verificación |
| **ADR** | Registro inmutable de una decisión de arquitectura |
| **Skill** | Herramienta ejecutable del arnés con manifiesto, runner y documentación |
| **Puerta de validación** | Validador que debe pasar para cerrar un cambio |

## 2. Términos de OpenSpec y SDD

| Término | Definición |
|---|---|
| `MOD-slug` | Identificador de módulo vivo consolidado en `modules/` |
| `proposal.md` | Documento que detalla el delta de lo que añade (+), modifica (~) o depreca (-) un cambio |
| `tasks.md` | Checklist técnico ejecutable asociado a una propuesta |
| `FR-NN` | Requisito funcional de una capacidad o módulo |
| `ST-NN` | Paso observable de un flujo o secuencia |
| `BR-NN` | Regla de negocio |
| `INV-NN` | Invariante que nunca puede violarse |
| `CT-NN` | Contrato de datos e interfaz pública |
| `TC-NN` | Caso de prueba unitaria o de integración |
| `AC-NN` | Criterio de aceptación |
| `US-NN` | Criterio de negocio de la historia de usuario |
| `DRAFT` | Spec en elaboración; no se implementa |
| `APPROVED` | Spec aprobada; el código debe cumplirla |
| `SUPERSEDED` | Spec reemplazada; apunta a su sustituta |

## 3. Términos de arquitectura

| Término | Definición |
|---|---|
| **Feature** | Slice funcional vertical con sus capas internas |
| **Core** | Infraestructura transversal sin lógica de negocio |
| **Composition root** | Punto único donde se ensamblan dependencias |
| **API pública** | Superficie que una feature expone a otras: barrel o carpeta `public/` |
| **DTO** | Objeto de transferencia entre fuente de datos y dominio |
| **Entidad** | Objeto del dominio con identidad y reglas |
| **Caso de uso** | Operación de negocio con entrada y salida tipadas |
| **Contrato** | Interfaz o tipo que define qué se promete, no cómo se cumple |
| **Invariante** | Propiedad que debe cumplirse siempre, en todo estado |

## 4. Términos de diseño

| Término | Definición |
|---|---|
| **Token** | Valor visual con nombre y rol, definido en `tokens.json` |
| **Foco** | Elemento que recibe la entrada del teclado o D-Pad |
| **Área segura** | Zona donde el contenido no se recorta por overscan o notch |
| **Blueprint** | Estructura funcional de una pantalla, sin valores visuales |

## 5. Términos de Dominio y Producto (DondeEstan)

- **Throttling adaptativo:** Estrategia de emisión de geolocalización que solo escribe en Firestore si delta_t >= 30s y desplazamiento >= 15m, o tras 120s de inactividad (heartbeat).
- **Spark Plan:** Nivel gratuito perpetuo de Firebase con límite de 20.000 escrituras y 50.000 lecturas diarias en Cloud Firestore.
- **Whitelist:** Colección de correos autorizados con estado preapproved, pending_approval o active gestionada exclusivamente por el administrador.
- **Gatekeeper (Pending Approval):** Estado de bloqueo preventivo tras el registro que impide cargar mapas o chats hasta la aprobación manual del administrador.
- **AdvancedMarkerElement:** Componente oficial moderno de Google Maps JS API para renderizar marcadores DOM dinámicos con foto de avatar y halo de estado.
- **Kinetic Bloom:** Sistema de diseño expresivo (Material 3 Expressive + Glassmorphism iOS) con paleta violeta, coral y menta, y dock flotante con desenfoque de 24px.
- **Purga Total:** Acción atómica del administrador que elimina un usuario de Firebase Auth, Firestore (/users y mensajes de /group_chat), Storage y Whitelist.

## 6. Regla de uso

- Si un término del código no aparece aquí, o falta el término o sobra el
  concepto.
- Prohibido usar dos palabras para el mismo concepto en documentos distintos.
- Un sinónimo aceptado se registra explícitamente como tal.


## 5. Términos de Dominio (DondeEstan)

- **Throttling adaptativo:** Estrategia de emisión de geolocalización que solo escribe en Firestore si delta_t >= 30s y desplazamiento >= 15m, o tras 120s de inactividad (heartbeat).
- **Spark Plan:** Nivel gratuito perpetuo de Firebase con límite de 20.000 escrituras y 50.000 lecturas diarias en Cloud Firestore.
- **Whitelist:** Colección de correos autorizados con estado preapproved, pending_approval o active gestionada exclusivamente por el administrador.
- **Gatekeeper (Pending Approval):** Estado de bloqueo preventivo tras el registro que impide cargar mapas o chats hasta la aprobación manual del administrador.
- **AdvancedMarkerElement:** Componente oficial moderno de Google Maps JS API para renderizar marcadores DOM dinámicos con foto de avatar y halo de estado.
- **Kinetic Bloom:** Sistema de diseño expresivo (Material 3 Expressive + Glassmorphism iOS) con paleta violeta, coral y menta, y dock flotante con desenfoque de 24px.
- **Purga Total:** Acción atómica del administrador que elimina un usuario de Firebase Auth, Firestore (/users y mensajes de /group_chat), Storage y Whitelist.
