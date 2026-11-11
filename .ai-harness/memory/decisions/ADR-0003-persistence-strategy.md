# ADR-0003: Estrategia de Persistencia y Caché (firebase)

- **Estado:** Aceptada
- **Fecha:** Inicialización del proyecto
- **Decisores:** Equipo de arquitectura

## Contexto
DondeEstan requiere una estrategia de almacenamiento de datos conforme a su modelo de persistencia: `firebase`. Debe garantizarse atomicidad, velocidad de lectura en frío y cero fugas de descriptores de conexión.

## Decisión
Adoptar almacenamiento desacoplado mediante el patrón Repository / Adaptador:
- Las entidades de negocio se persisten a través de contratos de repositorio tipados.
- Si es almacenamiento local o serverless (firebase), se prioriza la consistencia y la velocidad de consulta en disco o edge.
- Se aísla el motor de persistencia dentro de la capa transversal o propietaria correspondiente.

## Consecuencias
- **Positivas:** Capacidad de sustituir o actualizar el motor de base de datos sin tocar la lógica de negocio.
- **Negativas:** Se deben mantener migraciones de esquema versionadas y tests de integración deterministas.
