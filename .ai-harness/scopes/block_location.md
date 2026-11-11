# Scope — Geolocalización Reactiva y Google Maps (`block_location`)

> Solo define límites y fronteras de responsabilidad. Contratos, esquemas e implementación se especifican en la SDD.

---

## 1. Identidad

| Campo | Valor |
|---|---|
| Bloque | Geolocalización Reactiva y Google Maps |
| Dominio | Gestión del ciclo de vida WebKit (visibilitychange), throttling adaptativo (30s/15m o 120s heartbeat), marcadores AdvancedMarkerElement y presencia online/offline. |
| Ruta autorizada | `src/location/` |
| Rutas prohibidas | `Ninguna de otros bloques privados` |
| Formatos | Tipos nativos inmutables / JSON serializado |
| Estado | Límites estrictos y cerrados |

---

## 2. Propósito y Valor del Bloque

Es la autoridad responsable de **Gestión del ciclo de vida WebKit (visibilitychange), throttling adaptativo (30s/15m o 120s heartbeat), marcadores AdvancedMarkerElement y presencia online/offline.** dentro de DondeEstan.
Garantiza el aislamiento funcional del módulo, encapsulando sus estructuras internas y exponiendo únicamente interfaces públicas.

---

## 3. Posee (Responsabilidades exclusivas)

- Modelos de datos, reglas de negocio e invariantes específicos de Geolocalización Reactiva y Google Maps.
- Implementación interna y adaptadores necesarios para cumplir su función.
- Lógica de dominio, servicios e interfaces de Geolocalización Reactiva y Google Maps organizadas según Clean Architecture (PWA Modular).

---

## 4. No posee (Límites y exclusiones estrictas)

- Infraestructura transversal compartida (vive en `src/core/`).
- Entidades, contratos o datos pertenecientes a otras features.
- Configuración global o ciclo de vida transversal de la aplicación.
- Modificación directa de archivos del arnés o de pipelines de CI.

---

## 5. Estructura interna de rutas

```
src/location/
├── domain/        # Capa de domain
├── application/   # Capa de application
├── infrastructure/ # Capa de infrastructure
└── presentation/  # Capa de presentation
```

---

## 6. API Pública y Matriz de Dependencias

- **API Pública autorizada:** `src/location/index.ts` o `src/location/public/`.
- **Dependencias entrantes:** Solo módulos que consuman la interfaz pública documentada.
- **Prohibido:** Importar archivos de carpetas internas privadas de otro bloque.
