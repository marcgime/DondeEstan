# Propuesta de Cambio: [Título Breve del Cambio]

```yaml
change_id: "[YYYY-MM]-[slug-del-cambio]"
title: "[Título del cambio]"
module: "MOD-[slug]"               # Módulo afectado en .ai-harness/sdd/modules/
status: PROPOSED                    # PROPOSED | APPROVED | IMPLEMENTING | CONSOLIDATED
created_at: "YYYY-MM-DD"
author: "[autor/agente]"
tier: standard                      # fast_path | standard | core
```

---

## 1. Motivación y Contexto

> ¿Por qué es necesario este cambio? ¿Qué problema resuelve o qué nueva capacidad habilita?

---

## 2. Delta de Especificación (Cambios sobre el Módulo Maestro)

> Detalle exacto de qué cambia en `.ai-harness/sdd/modules/[modulo].md`.

### Contratos Afectados
- **[+] Añadido:** `CT-NN: [Nuevo Contrato]`
  - Descripción breve y firma propuesta.
- **[~] Modificado:** `CT-01`
  - Qué campos o métodos cambian y por qué.
- **[-] Deprecado:** `CT-02` (si aplica).

### Invariantes y Reglas Afectadas
- **[+] Añadido:** `BR-NN: [Nueva Regla de Negocio]`
- **[~] Modificado:** `BR-01` (si aplica).

### Flujos Afectados
- Explicación de cómo cambia la secuencia o los estados posibles.

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- ¿Rompe consumidores existentes? (Sí/No y mitigación).
- ¿Cómo afecta a la migración de datos o persistencia existente?
- Casos de fallo previstos y cómo se manejan.
