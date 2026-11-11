## 📋 Descripción del Cambio

> Explica brevemente qué aporta este cambio o qué problema soluciona.

---

## 🚦 Nivel de Gobernanza Aplicado

Selecciona la modalidad de este Pull Request:
- [ ] **Fast-Path:** Parche menor / bugfix urgente (<3 archivos modificados, sin cambios de arquitectura).
- [ ] **Standard (OpenSpec):** Nueva funcionalidad o cambio de contrato con propuesta consolidada.
- [ ] **Core:** Cambio arquitectural o de persistencia (incluye propuesta OpenSpec + ADR en `memory/adr/`).

---

## 🛡️ Checklist de Calidad Determinista (Obligatorio)

Marca las comprobaciones superadas localmente antes de solicitar revisión:

- [ ] `python .ai-harness/skills/harness-validator/runner.py` devuelve exit code 0.
- [ ] `python .ai-harness/skills/preflight/runner.py --strict` devuelve exit code 0.
- [ ] `python .ai-harness/skills/sync-sdd/runner.py` pasa sin divergencias.
- [ ] Si es Standard/Core: la propuesta ha sido consolidada en `modules/` y archivada en `archive/`.
- [ ] Si es Fast-Path: se han añadido o actualizado tests unitarios de regresión.
- [ ] **Tamper-Resistance:** NO se han modificado validadores en `.ai-harness/skills/`, contextos normativos ni `harness.config.yaml` sin autorización explícita.

