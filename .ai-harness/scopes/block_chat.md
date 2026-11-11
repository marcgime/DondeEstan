# Scope — Canal Único de Chat Grupal Familiar (`block_chat`)

> Solo define límites y fronteras de responsabilidad. Contratos, esquemas e implementación se especifican en la SDD.

---

## 1. Identidad

| Campo | Valor |
|---|---|
| Bloque | Canal Único de Chat Grupal Familiar |
| Dominio | Chat grupal reactivo para los 8 miembros, consulta limitada a los últimos 50 mensajes, desconexión activa del listener onSnapshot al cambiar de vista y prevención de doble envío. |
| Ruta autorizada | `src/chat/` |
| Rutas prohibidas | `Ninguna de otros bloques privados` |
| Formatos | Tipos nativos inmutables / JSON serializado |
| Estado | Límites estrictos y cerrados |

---

## 2. Propósito y Valor del Bloque

Es la autoridad responsable de **Chat grupal reactivo para los 8 miembros, consulta limitada a los últimos 50 mensajes, desconexión activa del listener onSnapshot al cambiar de vista y prevención de doble envío.** dentro de DondeEstan.
Garantiza el aislamiento funcional del módulo, encapsulando sus estructuras internas y exponiendo únicamente interfaces públicas.

---

## 3. Posee (Responsabilidades exclusivas)

- Modelos de datos, reglas de negocio e invariantes específicos de Canal Único de Chat Grupal Familiar.
- Implementación interna y adaptadores necesarios para cumplir su función.
- Lógica de dominio, servicios e interfaces de Canal Único de Chat Grupal Familiar organizadas según Clean Architecture (PWA Modular).

---

## 4. No posee (Límites y exclusiones estrictas)

- Infraestructura transversal compartida (vive en `src/core/`).
- Entidades, contratos o datos pertenecientes a otras features.
- Configuración global o ciclo de vida transversal de la aplicación.
- Modificación directa de archivos del arnés o de pipelines de CI.

---

## 5. Estructura interna de rutas

```
src/chat/
├── domain/        # Capa de domain
├── application/   # Capa de application
├── infrastructure/ # Capa de infrastructure
└── presentation/  # Capa de presentation
```

---

## 6. API Pública y Matriz de Dependencias

- **API Pública autorizada:** `src/chat/index.ts` o `src/chat/public/`.
- **Dependencias entrantes:** Solo módulos que consuman la interfaz pública documentada.
- **Prohibido:** Importar archivos de carpetas internas privadas de otro bloque.
