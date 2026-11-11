# Framework SDD y gobernanza OpenSpec

## 1. Protocolo OpenSpec-First (Delta-Driven Development)

Ninguna funcionalidad o modificación de reglas se programa sin una propuesta aislada previa en `.ai-harness/sdd/changes/`.

> **Regla de oro:** primero se propone el delta aislado, después se revisa en 2 minutos, después se consolida en el módulo vivo, después se implementa el código y finalmente se audita de forma determinista.

Flujo unidireccional obligatorio:

1. **Propuesta (Delta):** se genera `changes/<id>/proposal.md` y `tasks.md` indicando qué añade (`+`), modifica (`~`) o depreca (`-`) del módulo maestro.
2. **Revisión Humana:** el desarrollador valida el impacto conceptual sin sobrecarga cognitiva.
3. **Consolidación:** se actualiza la verdad viva en `modules/<modulo>.md` y la propuesta se traslada a `archive/<id>/`.
4. **Implementación:** el agente o programador implementa el código guiándose por el checklist de `tasks.md`.
5. **Auditoría:** `sync-sdd` y `preflight` comprueban que no hay tareas pendientes ni divergencias de contratos.

---

## 2. Gobernanza Graduada: Tres Niveles de Rigor

Para no ralentizar el desarrollo ágil ni obligar a redactar propuestas pesadas ante cambios triviales, el arnés define tres niveles:

| Nivel | Cuándo aplica | Requisito SDD | Verificación |
|---|---|---|---|
| **Fast-Path** | Parches, hotfixes, ajustes de <3 archivos | Sin propuesta formal | Test unitario + `preflight --tier fast` |
| **Standard** | Nueva funcionalidad, cambio de regla o contrato | Propuesta OpenSpec completa | `propose-change` → `consolidate-change` → `preflight` + `sync-sdd` |
| **Core** | Cambios estructurales, protocolo, persistencia | Propuesta OpenSpec + ADR | Estándar + Registro de ADR en `memory/adr/` |

---

## 3. Taxonomía de Directorios

```text
.ai-harness/sdd/
├── modules/                        # Verdad viva consolidada (Living Specs por capacidad)
│   ├── README.md                   # Catálogo de módulos
│   ├── auth.md                     # Contratos, invariantes y flujos de autenticación
│   └── ...                         # Módulos del dominio
├── changes/                        # Propuestas activas (en revisión o implementación)
│   └── [YYYY-MM]-[slug]/
│       ├── proposal.md             # Delta de cambio
│       └── tasks.md                # Checklist de tareas
├── archive/                        # Histórico de cambios consolidados
│   └── [YYYY-MM]-[slug]/           # Propuestas implementadas (inmutables)
└── templates/                      # Plantillas canónicas
    ├── module.template.md
    ├── proposal.template.md
    └── tasks.template.md
```

---

## 4. Estructura de un Módulo Vivo (`modules/<modulo>.md`)

Cada módulo agrupa en un único documento todo lo relativo a una capacidad:
- **Metadatos:** ID (`MOD-slug`), responsable, ruta de código y scope asociado.
- **Propósito y Responsabilidades:** Qué hace y qué tiene prohibido hacer.
- **Contratos y Tipos Públicos (`CT-*`):** Interfaces que expone a otros módulos.
- **Reglas de Negocio e Invariantes (`BR-*`):** Restricciones no negociables.
- **Flujos y Procesos Clave:** Secuencias y transiciones de estado de este módulo.
- **Mapa de Implementación:** Tabla con la correspondencia exacta entre contratos y rutas de código en disco.

---

## 5. Auditoría Determinista (`sync-sdd`)

El runner `python .ai-harness/skills/sync-sdd/runner.py` audita:
- Que los `target_path` de los módulos existen en disco.
- Que no hay divergencias de hash entre el código implementado y la línea base.
- Que en las propuestas en curso en `changes/` no quedan tareas pendientes antes de cerrar la entrega.
