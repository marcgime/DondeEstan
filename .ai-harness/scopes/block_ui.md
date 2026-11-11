# Scope — Sistema de Diseño Kinetic Bloom y Shell PWA (`block_ui`)

> Solo define límites y fronteras de responsabilidad. Contratos, esquemas e implementación se especifican en la SDD.

---

## 1. Identidad

| Campo | Valor |
|---|---|
| Bloque | Sistema de Diseño Kinetic Bloom y Shell PWA |
| Dominio | Componentes visuales Material 3 Expressive, dock flotante glassmorphic (blur 24px), tokens de diseño Kinetic Bloom, temas adaptable y adaptación a safe-areas de iOS. |
| Ruta autorizada | `src/ui/` |
| Rutas prohibidas | `Ninguna de otros bloques privados` |
| Formatos | Tipos nativos inmutables / JSON serializado |
| Estado | Límites estrictos y cerrados |

---

## 2. Propósito y Valor del Bloque

Es la autoridad responsable de **Componentes visuales Material 3 Expressive, dock flotante glassmorphic (blur 24px), tokens de diseño Kinetic Bloom, temas adaptable y adaptación a safe-areas de iOS.** dentro de DondeEstan.
Garantiza el aislamiento funcional del módulo, encapsulando sus estructuras internas y exponiendo únicamente interfaces públicas.

---

## 3. Posee (Responsabilidades exclusivas)

- Modelos de datos, reglas de negocio e invariantes específicos de Sistema de Diseño Kinetic Bloom y Shell PWA.
- Implementación interna y adaptadores necesarios para cumplir su función.
- Componentes de presentación, interfaces web y vistas de Sistema de Diseño Kinetic Bloom y Shell PWA.

---

## 4. No posee (Límites y exclusiones estrictas)

- Infraestructura transversal compartida (vive en `src/core/`).
- Entidades, contratos o datos pertenecientes a otras features.
- Configuración global o ciclo de vida transversal de la aplicación.
- Modificación directa de archivos del arnés o de pipelines de CI.

---

## 5. Estructura interna de rutas

```
src/ui/
├── components/      # Componentes visuales atómicos reutilizables (DS-*)
├── views/           # Páginas y vistas principales
└── theme/           # Integración y mapeo de tokens (tokens.json)
```

---

## 6. API Pública y Matriz de Dependencias

- **API Pública autorizada:** `src/ui/index.ts` o `src/ui/public/`.
- **Dependencias entrantes:** Solo módulos que consuman la interfaz pública documentada.
- **Prohibido:** Importar archivos de carpetas internas privadas de otro bloque.
