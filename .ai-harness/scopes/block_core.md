# Scope — Infraestructura Base y Configuración Transversal (`block_core`)

> Solo define límites y fronteras de responsabilidad. Contratos, esquemas e implementación se especifican en la SDD.

---

## 1. Identidad

| Campo | Valor |
|---|---|
| Bloque | Infraestructura Base y Configuración Transversal |
| Dominio | Inicialización del SDK Firebase (Auth, Firestore, Storage), variables de entorno, utilidades comunes y registro del Service Worker PWA. |
| Ruta autorizada | `src/core/` |
| Rutas prohibidas | `Ninguna de otros bloques privados` |
| Formatos | Tipos nativos inmutables / JSON serializado |
| Estado | Límites estrictos y cerrados |

---

## 2. Propósito y Valor del Bloque

Es la autoridad responsable de **Inicialización del SDK Firebase (Auth, Firestore, Storage), variables de entorno, utilidades comunes y registro del Service Worker PWA.** dentro de DondeEstan.
Garantiza el aislamiento funcional del módulo, encapsulando sus estructuras internas y exponiendo únicamente interfaces públicas.

---

## 3. Posee (Responsabilidades exclusivas)

- Modelos de datos, reglas de negocio e invariantes específicos de Infraestructura Base y Configuración Transversal.
- Implementación interna y adaptadores necesarios para cumplir su función.
- Lógica de dominio, servicios e interfaces de Infraestructura Base y Configuración Transversal organizadas según Clean Architecture (PWA Modular).

---

## 4. No posee (Límites y exclusiones estrictas)

- Reglas de negocio privadas de las features funcionales.
- Componentes visuales o interfaces gráficas de usuario.
- Modificación directa de archivos del arnés o de pipelines de CI.

---

## 5. Estructura interna de rutas

```
src/core/
├── domain/        # Capa de domain
├── application/   # Capa de application
├── infrastructure/ # Capa de infrastructure
└── presentation/  # Capa de presentation
```

---

## 6. API Pública y Matriz de Dependencias

- **API Pública autorizada:** `src/core/index.ts` o `src/core/public/`.
- **Dependencias entrantes:** Solo módulos que consuman la interfaz pública documentada.
- **Prohibido:** Importar archivos de carpetas internas privadas de otro bloque.
