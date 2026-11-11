# Scope — Dominio y datos (`block_domain`)

> Este documento solo define límites de escritura. Los contratos se especifican
> en la SDD; el diseño visual, en `ui-design-system.md`.

## Identidad

| Campo | Valor |
|---|---|
| Bloque | Dominio, datos y servicios |
| Dominio | Reglas de negocio y persistencia |
| Rutas autorizadas | `lib/features/<feature>/domain/`, `lib/features/<feature>/data/`, `lib/features/<feature>/application/` |
| Consumidores | `lib/app/` y la capa de presentación de la misma feature |
| Estado | Límites cerrados |

## Propósito

Contiene la verdad del negocio: entidades, contratos de repositorio, casos de
uso, DTOs, fuentes de datos y controladores de aplicación. No conoce widgets.

## Posee

- Entidades y objetos de valor del dominio.
- Contratos de repositorio y de servicio.
- Casos de uso y controladores de aplicación.
- DTOs, mapeadores y fuentes locales o remotas.
- Esquemas de persistencia y su migración.

## No posee

- Widgets, rutas, temas ni estado de presentación.
- Acceso directo a APIs de UI del framework.
- Cadenas visibles al usuario sin pasar por localización.
- Dependencias hacia `lib/features/*/presentation/`.

## Rutas

```
lib/features/<feature>/
├── domain/
│   ├── entities/
│   ├── repositories/
│   └── usecases/
├── data/
│   ├── models/
│   ├── datasources/
│   └── repositories/
└── application/
    └── controllers/
```

Prohibido escribir en `lib/app/` y en `lib/features/*/presentation/`.
Prohibido modificar archivos del arnés o CI: `.ai-harness/skills/`, `.ai-harness/context/`, `harness.config.yaml`, `.github/`.

## Comprobaciones

- [ ] El dominio no importa HTTP, almacenamiento ni paquetes de UI.
- [ ] Ninguna feature importa las tripas de otra: solo su API pública.
- [ ] Toda persistencia declara propietario único y límite de crecimiento.
