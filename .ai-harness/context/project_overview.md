# Overview del producto

Describe qué es el sistema, qué pilares lo sostienen y qué queda fuera de
alcance. Es la referencia para decidir si una idea pertenece al producto o no.

---

## 1. Resumen ejecutivo

`DondeEstan` es `PWA familiar privada para visualización de ubicación en directo, chat grupal instantáneo y administración estricta de accesos a coste cero (Firebase Spark + Google Maps Platform).`.

La propuesta de valor es `<qué problema resuelve y por qué esta solución es
mejor que la alternativa actual>`. El sistema se ejecuta en `iOS Safari PWA, Mobile Web` y su
stack es `TypeScript (Vite PWA + Tailwind CSS)`.

> Al copiar la plantilla, este es el primer documento que debe dejar de tener
> marcadores entre ángulos.

## 2. Pilares

1. **Propósito claro:** cada funcionalidad responde a un problema del usuario
   descrito aquí.
2. **Contratos explícitos:** la interfaz entre módulos está especificada, no
   improvisada.
3. **Rendimiento acotado:** toda caché declara su límite y su política de evicción.
4. **Privacidad por diseño:** solo se recogen los datos imprescindibles.
5. **Accesibilidad:** toda acción es alcanzable sin ratón.
6. **Operación local primero:** el sistema funciona sin depender de un servicio
   remoto salvo que el producto lo exija explícitamente.

## 3. Módulos del sistema

| Módulo | Responsabilidad | Frontera |
|---|---|---|
| `<módulo A>` | `<qué hace>` | `<qué no hace>` |
| `<módulo B>` | `<qué hace>` | `<qué no hace>` |
| `<módulo C>` | `<qué hace>` | `<qué no hace>` |

Los módulos se comunican mediante contratos definidos en `architecture_rules.md`.
Ningún módulo conoce las tripas de otro.

## 4. Flujo principal

1. El usuario entra y ve `<estado inicial disponible sin red>`.
2. Selecciona `<elemento>` y el sistema resuelve `<operación>`.
3. `<módulo>` entrega `<resultado>` al `<módulo consumidor>`.
4. La interfaz refleja `<estado>` y permite `<siguiente acción>`.
5. Al salir se persiste `<lo que deba persistir>` y se liberan los recursos.

## 5. Fuera de alcance

- `<capacidad que no se implementa en esta fase>`.
- `<integración descartada>`.
- `<modelo de negocio no previsto>`.

Lo que esté en esta lista no se implementa aunque parezca fácil: requiere una
decisión explícita y una actualización de este documento.

## 6. Criterios de éxito

- `<criterio medible del flujo principal>`.
- `<criterio de rendimiento o de recursos>`.
- `<criterio de accesibilidad>`.
- `<criterio de privacidad>`.

## 7. Glosario de producto

Los términos de negocio se definen en `glossary.md`; este documento no los
duplica.
