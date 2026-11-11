# Scope — Perfil, Ajustes y Diagnóstico del Dispositivo (`block_profile`)

> Solo define límites y fronteras de responsabilidad. Contratos, esquemas e implementación se especifican en la SDD.

---

## 1. Identidad

| Campo | Valor |
|---|---|
| Bloque | Perfil, Ajustes y Diagnóstico del Dispositivo |
| Dominio | Edición de display_name, compresión y recorte de avatar en <canvas> (<300x300, <50KB) hacia Storage, diagnóstico de permisos GPS en Safari y logout. |
| Ruta autorizada | `src/profile/` |
| Rutas prohibidas | `Ninguna de otros bloques privados` |
| Formatos | Tipos nativos inmutables / JSON serializado |
| Estado | Límites estrictos y cerrados |

---

## 2. Propósito y Valor del Bloque

Es la autoridad responsable de **Edición de display_name, compresión y recorte de avatar en <canvas> (<300x300, <50KB) hacia Storage, diagnóstico de permisos GPS en Safari y logout.** dentro de DondeEstan.
Garantiza el aislamiento funcional del módulo, encapsulando sus estructuras internas y exponiendo únicamente interfaces públicas.

---

## 3. Posee (Responsabilidades exclusivas)

- Modelos de datos, reglas de negocio e invariantes específicos de Perfil, Ajustes y Diagnóstico del Dispositivo.
- Implementación interna y adaptadores necesarios para cumplir su función.
- Lógica de dominio, servicios e interfaces de Perfil, Ajustes y Diagnóstico del Dispositivo organizadas según Clean Architecture (PWA Modular).

---

## 4. No posee (Límites y exclusiones estrictas)

- Infraestructura transversal compartida (vive en `src/core/`).
- Entidades, contratos o datos pertenecientes a otras features.
- Configuración global o ciclo de vida transversal de la aplicación.
- Modificación directa de archivos del arnés o de pipelines de CI.

---

## 5. Estructura interna de rutas

```
src/profile/
├── domain/        # Capa de domain
├── application/   # Capa de application
├── infrastructure/ # Capa de infrastructure
└── presentation/  # Capa de presentation
```

---

## 6. API Pública y Matriz de Dependencias

- **API Pública autorizada:** `src/profile/index.ts` o `src/profile/public/`.
- **Dependencias entrantes:** Solo módulos que consuman la interfaz pública documentada.
- **Prohibido:** Importar archivos de carpetas internas privadas de otro bloque.
