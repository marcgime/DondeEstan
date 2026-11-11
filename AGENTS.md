# AGENTS.md — Orquestador del arnés para DondeEstan

Punto de entrada obligatorio para cualquier agente de IA en este repositorio.
Este archivo solo enruta: no duplica reglas de producto, arquitectura ni
implementación.

---

## 1. Carga inicial obligatoria (JIT)

Antes de leer código, proponer cambios o escribir archivos, cargar en este orden:

1. `.ai-harness/context/system_identity.md` — rol y postura del agente.
2. `.ai-harness/context/harness_governance.md` — reglas del propio arnés.
3. `.ai-harness/context/project_overview.md` — visión y módulos del producto.
4. `.ai-harness/context/architecture_rules.md` — fronteras e invariantes.
5. `.ai-harness/context/ui-design-system.md` y `.ai-harness/design-system/README.md`.
6. `.ai-harness/scopes/block_*.md` — scope del área que se va a tocar (`block_core.md`, `block_auth.md`, `block_admin.md`, `block_location.md`, `block_chat.md`, `block_profile.md`, `block_ui.md`).
7. `.ai-harness/context/sdd_framework.md` — metodología OpenSpec (modules, changes, archive).
8. El módulo vivo `.ai-harness/sdd/modules/<modulo>.md` y la propuesta en `changes/` activa, si existe.
9. `.ai-harness/memory/failure_modes.md` — fallos que no deben repetirse.

Si falta el scope o la definición del módulo, detenerse y pedir la definición antes
de implementar.

---

## 2. Enrutamiento por tarea

| Tarea | Fuente de verdad | Herramienta |
|---|---|---|
| Inicialización del arnés | `.ai-harness/skills/bootstrap-harness/` | `/bootstrap-harness.md` |
| Configuración estructural | `harness.config.yaml` | — |
| Descubrimiento de skills | `.ai-harness/skills/registry.yaml` | `/list-skills.md` |
| Visión de producto | `context/project_overview.md` | — |
| Arquitectura y fronteras | `context/architecture_rules.md` | — |
| Estructura de código | `context/project_structure.md` | — |
| Estándares de código | `context/coding_standards.md` | — |
| Diseño y tokens | `context/ui-design-system.md` y `design-system/` | — |
| Seguridad y privacidad | `context/security_privacy.md` | — |
| Glosario | `context/glossary.md` | — |
| Plataformas | `context/platform_matrix.md` | — |
| Testing | `context/testing_guidelines.md` | — |
| Límites de escritura | `scopes/block_*.md` | — |
| Módulos consolidados | `.ai-harness/sdd/modules/` | — |
| Propuesta de cambio (delta) | `.ai-harness/sdd/changes/` | `/propose-change.md` |
| Consolidación de cambio | `.ai-harness/sdd/archive/` | `/consolidate-change.md` |
| Validación de producto | `context/architecture_rules.md` §6 | `/preflight.md` |
| Validación del arnés | `context/harness_governance.md` §8 | `/harness-validator.md` |
| Auditoría spec↔código | `.ai-harness/sdd/` | `/sync-sdd.md` |
| Arranque de la app | `context/platform_matrix.md` | `/launch-app.md` |
| Publicación Git | `.clinerules/workflows/git-publish.md` | `/git-publish.md` solo bajo demanda |

Los workflows se descubren en `.clinerules/workflows/`; el nombre del comando
incluye la extensión `.md`. Si no aparecen en el menú `/`, recargar la ventana.

---

## 3. Reglas de trabajo

- **OpenSpec-First:** ningún cambio de feature o contrato se programa sin propuesta aislada previa en `changes/`.
- **Sin invención:** si falta un dato, se registra como pregunta abierta y se detiene la implementación.
- **Configuración primero:** un cambio de estructura del arnés empieza en `harness.config.yaml`, no en el código de un validador.
- **Inmutabilidad del arnés:** el agente no debe modificar scripts en `.ai-harness/skills/`, `.ai-harness/context/` ni `harness.config.yaml` durante tareas de desarrollo de producto.
- **Privacidad:** zero_telemetry.
- **Accesibilidad:** interfaces responsivas, contraste AA y controles navegables con teclado según WCAG.
- **Diseño:** solo tokens de `design-system/tokens.json`; prohibido HEX literal.
- **Git:** `git push` solo con instrucción explícita del usuario.
- **Sin residuos:** no introducir referencias ni tecnologías de otro proyecto.

---

## 4. Cierre de tarea

Antes de declarar una tarea terminada:

1. Ejecutar `python .ai-harness/skills/harness-validator/runner.py`.
2. Ejecutar `python .ai-harness/skills/preflight/runner.py`.
3. Ejecutar `python .ai-harness/skills/sync-sdd/runner.py`.
4. Corregir la causa raíz de cualquier fallo; no reejecutar a ciegas.
5. Actualizar el módulo maestro y el mapa de implementación si cambió el comportamiento.
