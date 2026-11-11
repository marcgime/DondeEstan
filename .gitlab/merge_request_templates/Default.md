## 📋 Descripción del Merge Request

> Resumen conciso del cambio y su impacto en el sistema.

---

## 🚦 Nivel de Gobernanza Aplicado

- [ ] **Fast-Path:** Parche menor / bugfix urgente (<3 archivos, sin cambios estructurales).
- [ ] **Standard (OpenSpec):** Funcionalidad o cambio de contrato con propuesta consolidada.
- [ ] **Core:** Cambio arquitectural (propuesta OpenSpec + ADR registrado).

---

## 🛡️ Checklist de Calidad Determinista (Obligatorio)

- [ ] `python .ai-harness/skills/harness-validator/runner.py` (código 0).
- [ ] `python .ai-harness/skills/preflight/runner.py --strict` (código 0).
- [ ] `python .ai-harness/skills/sync-sdd/runner.py` (sin divergencias).
- [ ] Si es Standard/Core: propuesta consolidada en `modules/` y archivada en `archive/`.
- [ ] Si es Fast-Path: tests unitarios de regresión incluidos.
- [ ] **Tamper-Resistance:** Ningún árbitro o archivo de gobernanza ha sido modificado sin permiso.

/label ~"review-pending"

