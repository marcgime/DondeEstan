# Scope — Autenticación, Whitelist y Control de Acceso (`block_auth`)

> Solo define límites y fronteras de responsabilidad. Contratos, esquemas e implementación se especifican en la SDD.

---

## 1. Identidad

| Campo | Valor |
|---|---|
| Bloque | Autenticación, Whitelist y Control de Acceso |
| Dominio | Flujo de registro y login cerrado contra /whitelist/{email}, asignación de estado pending_approval en Firestore y vista fija gatekeeper de bloqueo. |
| Ruta autorizada | `src/auth/` |
| Rutas prohibidas | `Ninguna de otros bloques privados` |
| Formatos | Tipos nativos inmutables / JSON serializado |
| Estado | Límites estrictos y cerrados |

---

## 2. Propósito y Valor del Bloque

Es la autoridad responsable de **Flujo de registro y login cerrado contra /whitelist/{email}, asignación de estado pending_approval en Firestore y vista fija gatekeeper de bloqueo.** dentro de DondeEstan.
Garantiza el aislamiento funcional del módulo, encapsulando sus estructuras internas y exponiendo únicamente interfaces públicas.

---

## 3. Posee (Responsabilidades exclusivas)

- Modelos de datos, reglas de negocio e invariantes específicos de Autenticación, Whitelist y Control de Acceso.
- Implementación interna y adaptadores necesarios para cumplir su función.
- Lógica de dominio, servicios e interfaces de Autenticación, Whitelist y Control de Acceso organizadas según Clean Architecture (PWA Modular).

---

## 4. No posee (Límites y exclusiones estrictas)

- Infraestructura transversal compartida (vive en `src/core/`).
- Entidades, contratos o datos pertenecientes a otras features.
- Configuración global o ciclo de vida transversal de la aplicación.
- Modificación directa de archivos del arnés o de pipelines de CI.

---

## 5. Estructura interna de rutas

```
src/auth/
├── domain/        # Capa de domain
├── application/   # Capa de application
├── infrastructure/ # Capa de infrastructure
└── presentation/  # Capa de presentation
```

---

## 6. API Pública y Matriz de Dependencias

- **API Pública autorizada:** `src/auth/index.ts` o `src/auth/public/`.
- **Dependencias entrantes:** Solo módulos que consuman la interfaz pública documentada.
- **Prohibido:** Importar archivos de carpetas internas privadas de otro bloque.
