# Reglas de Integración del Agente con el Arnés — DondeEstan

## 1. Autoridad y Jerarquía
`AGENTS.md` es el enrutador maestro del repositorio. El agente no puede contradecir, relajar ni ignorar las reglas de `context/` ni de los scopes activos.

## 2. Modus Operandi
1. **Carga JIT:** Antes de inspeccionar código o proponer cambios, cargar en orden los documentos de `AGENTS.md` §1.
2. **Límites de Escritura:** Localizar el scope correspondiente en `.ai-harness/scopes/` y escribir exclusivamente en sus rutas autorizadas.
3. **OpenSpec-First:** Prohibido escribir código de nuevas features sin propuesta en `changes/` consolidada en el módulo maestro. Para hotfixes, aplicar Fast-Path (<3 archivos).
4. **Cero Invención:** Si falta un dato o requerimiento, registrarlo como pregunta abierta y detenerse.

## 3. Despacho de Workflows
Los comandos disponibles se invocan con barra inclinada (`/`) a través de `.clinerules/workflows/`:
- `/list-skills.md`: Inventario de herramientas y skills operativas.
- `/propose-change.md`: Propuesta de cambio aislada (delta OpenSpec).
- `/consolidate-change.md`: Consolidación y archivo de propuesta aprobada.
- `/harness-validator.md`: Verificación de integridad normativa.
- `/preflight.md`: Puerta de calidad de código y arquitectura.
- `/sync-sdd.md`: Auditoría de módulos vivos y tareas en curso.
- `/launch-app.md`: Arranque de la aplicación.
- `/git-publish.md`: Publicación segura en Git (solo bajo demanda).

## 4. Resolución Autónoma de Problemas
- Si un test o validador falla, leer la traza de error antes de editar a ciegas.
- Prohibido silenciar excepciones o usar `--no-verify`.
- Corregir la causa raíz del fallo y revalidar las puertas de enlace.
