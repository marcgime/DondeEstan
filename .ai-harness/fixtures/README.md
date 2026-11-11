# Fixtures deterministas

Datos de prueba reproducibles, sin red y sin servicios externos. Un fixture es
entrada conocida con salida esperada: si cambia el fixture, cambia el test.

## Estructura sugerida

```
fixtures/
├── valid/       # Casos que deben procesarse sin error
├── invalid/     # Casos que deben rechazarse con un error concreto
└── edge/        # Límites: vacío, máximo, duplicado, formato inesperado
```

## Reglas

- Los fixtures no contienen datos personales ni contenido con derechos.
- Cada fixture declara en su nombre el caso que representa.
- Los tests no descargan fixtures de Internet.
- Los logs de fallo no se guardan aquí: van a `memory/ephemeral_feedback/`.
- Un fixture sin test que lo consuma es deuda: se elimina o se usa.
