# ADR-0002: Adopción de Clean Architecture (PWA Modular) y Aislamiento Modular

- **Estado:** Aceptada
- **Fecha:** Inicialización del proyecto
- **Decisores:** Equipo de arquitectura

## Contexto
El sistema crecerá modularmente con múltiples bloques funcionales (core, auth, admin, location, chat, profile, ui). Permitir que la presentación acceda directamente a bases de datos o que los servicios dependan de detalles de I/O privados genera deuda técnica insostenible y acoplamiento severo ante modificaciones de agentes de IA.

## Decisión
Implementar **Clean Architecture (PWA Modular)** estricta:
1. El dominio es puro, inmutable y no depende de frameworks externos ni de almacenamiento físico.
2. La infraestructura implementa interfaces definidas en el dominio.
3. Las features no importan código interno de otras features; toda comunicación es por contratos de API pública.

## Consecuencias
- **Positivas:** Testabilidad del 100 % del dominio sin mocks complejos, aislamiento ante cambios de librerías y menor propensión a errores de agentes de IA.
- **Negativas:** Mayor número inicial de archivos y necesidad de mapear DTOs a entidades inmutables.
