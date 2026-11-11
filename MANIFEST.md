# MANIFEST — qué copiar y qué no

Lista canónica de los elementos que forman el arnés de DondeEstan. Al trasladarlo a un
proyecto nuevo, se copia solo la sección 1.

---

## 1. Núcleo copiable

| Ruta | Obligatorio | Función |
|---|---|---|
| `AGENTS.md` | Sí | Enrutador operativo |
| `harness.config.yaml` | Sí | Configuración estructural |
| `requirements.txt` | Sí | Dependencias del tooling |
| `.aiignore` | Sí | Exclusión de contexto para el agente |
| `.gitignore` | Sí | Exclusión de control de versiones |
| `.clinerules/rules.md` | Sí | Reglas de integración del agente |
| `.clinerules/workflows/*.md` | Sí | Workflows invocables con `/` |
| `.agents/skills/<name>/SKILL.md` | Sí | Documentación de uso por skill |
| `.agents/skills/README.md` | Sí | Índice de skills |
| `.ai-harness/context/*` | Sí | 12 documentos normativos |
| `.ai-harness/scopes/*` | Sí | Límites de escritura |
| `.ai-harness/sdd/templates/*` | Sí | Plantillas y convención OpenSpec |
| `.ai-harness/sdd/modules/*` | Sí | Módulos vivos consolidados |
| `.ai-harness/sdd/changes/*` | Sí | Propuestas activas de cambio |
| `.ai-harness/sdd/archive/*` | Sí | Histórico de cambios completados |
| `.ai-harness/memory/*` | Sí | Modos de fallo, ADRs y feedback |
| `.ai-harness/design-system/*` | Sí | Tokens y documentos de diseño |
| `.ai-harness/fixtures/README.md` | Sí | Convención de datos de prueba |
| `.ai-harness/skills/**` | Sí | Validadores y runners |

---

## 2. No copiable

| Ruta | Motivo |
|---|---|
| `README.md` | Presentación de este producto específico |
| `MANIFEST.md` | Este archivo |
| `.ai-harness/memory/ephemeral_feedback/*` | Logs locales de ejecución |
| `.ai-harness/memory/sync-state.json` | Baseline generada por sync-sdd |
| `.git/` | Historia del repositorio |
