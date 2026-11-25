# Scope — Planificador de Viajes e Itinerarios GuIA (`block_guia`)

> Solo define límites y fronteras de responsabilidad. Contratos, esquemas e implementación se especifican en la SDD.

---

## 1. Identidad

| Campo | Valor |
|---|---|
| Bloque | Planificador de Viajes e Itinerarios GuIA |
| Dominio | Integración del módulo GuIA de viajes e itinerarios con acceso único compartido para usuarios cuyos grupos tengan habilitado `guia_enabled`. |
| Ruta autorizada | `src/guia/` |
| Rutas prohibidas | `Ninguna de otros bloques privados` |
| Formatos | Tipos nativos inmutables / JSON serializado |
| Estado | Límites estrictos y cerrados |

---

## 2. Propósito y Valor del Bloque

Es la autoridad responsable de **Integración del módulo GuIA de viajes e itinerarios con acceso único compartido para usuarios cuyos grupos tengan habilitado `guia_enabled`.** dentro de DondeEstan.
Garantiza el aislamiento funcional del módulo, encapsulando sus estructuras internas y exponiendo únicamente interfaces públicas.

---

## 3. Posee (Responsabilidades exclusivas)

- Modelos de datos, reglas de negocio e invariantes específicos de Planificador de Viajes e Itinerarios GuIA.
- Implementación interna y adaptadores necesarios para cumplir su función.
- Lógica de dominio, servicios e interfaces de Planificador de Viajes e Itinerarios GuIA organizadas según Clean Architecture (PWA Modular).

---

## 4. No posee (Límites y exclusiones estrictas)

- Infraestructura transversal compartida (vive en `src/core/`).
- Entidades, contratos o datos pertenecientes a otras features.
- Configuración global o ciclo de vida transversal de la aplicación.
- Modificación directa de archivos del arnés o de pipelines de CI.

---

## 5. Estructura interna de rutas

```
src/guia/
├── views/         # Capa de presentation
├── types.ts       # Modelos de dominio
├── generator.ts   # Generador determinista
└── guia_service.ts # Servicio de persistencia
```

---

## 6. API Pública y Matriz de Dependencias

- **API Pública autorizada:** `src/guia/index.ts`.
- **Dependencias entrantes:** Solo módulos que consuman la interfaz pública documentada.
- **Prohibido:** Importar archivos de carpetas internas privadas de otro bloque.
