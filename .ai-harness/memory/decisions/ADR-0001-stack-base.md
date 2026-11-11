# ADR-0001: Arquitectura PWA iOS con Stack TypeScript y Servicios Serverless Firebase Spark (Coste Cero)

- **Estado:** Aceptada
- **Fecha:** Inicialización del proyecto
- **Decisores:** Equipo de arquitectura

## Contexto
Se requiere un entorno privado, seguro y cerrado para 8 familiares con dispositivos iPhone con ubicación en tiempo real y chat. La restricción estratégica inamovible es coste 0,00 €/mes, sin cuotas de Apple Developer Program (99 $/año) y confinado 100% en el plan gratuito permanente de Firebase (Spark) y Google Maps Platform (200 $/mes crédito recurrente).

## Decisión
Desarrollar una Progressive Web App (PWA) instalable directamente en Safari iOS («Añadir a pantalla de inicio» con display: standalone). Stack frontend con TypeScript, Vite y Tailwind CSS, respaldado por Firebase Auth, Firestore y Storage, y Google Maps JavaScript API con AdvancedMarkerElement.

## Consecuencias
Ventajas: Despliegue inmediato sin revisión de App Store ni costes recurrentes. Desafíos: WebKit en iOS suspende JavaScript en segundo plano, lo que requiere un ciclo de vida reactivo con visibilitychange, detección de desconexión abrupta (>90s) y estrangulamiento estricto de coordenadas (30s/15m).
