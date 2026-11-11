# Guía de Contribución — AI Harness Launcher

¡Gracias por tu interés en contribuir a **AI Harness Launcher**!  
Este proyecto busca construir el estándar de referencia en **ingeniería de arneses y gobernanza determinista para agentes de IA**.

Tanto si eres un desarrollador humano como si estás colaborando asistido por un agente (Antigravity, Cursor, Claude Code, Cline), las contribuciones deben seguir las reglas de calidad y trazabilidad de este repositorio.

---

## 🏛️ Filosofía: Cero Alucinaciones y Verificación Determinista

En este repositorio, el código no se aprueba por *"opinión"* o *"parece que funciona"*, sino porque supera puertas de calidad ejecutables en Python:
1. **`harness-validator`**: Valida que la estructura del arnés, su contexto y sus metadatos son coherentes.
2. **`preflight`**: Audita linters, inmutabilidad de contratos, fronteras arquitectónicas y tokens.
3. **`sync-sdd`**: Comprueba que la verdad viva de los módulos y las tareas técnicas están sincronizadas con el código en disco.

---

## 🚦 Los Tres Niveles de Cambio

Antes de abrir una contribución, clasifica tu cambio:

| Nivel | Cuándo aplica | Procedimiento |
|---|---|---|
| **Fast-Path** | Bugfixes, parches de <3 archivos, ajustes cosméticos | Test unitario de regresión + `preflight --tier fast`. No requiere propuesta formal. |
| **Standard** | Nuevas funcionalidades, reglas o contratos | Flujo OpenSpec: `propose-change` → consolidación en `modules/` → código + tests + validadores. |
| **Core** | Cambios arquitecturales, base de datos o protocolos | Flujo Standard + registro de ADR en `memory/decisions/`. |

---

## 👣 Paso a Paso para Contribuir (GitHub y GitLab)

### 1. Clona el repositorio y prepara el entorno
```bash
git clone <URL_DEL_REPOSITORIO>
cd harness-launcher
python -m pip install -r requirements.txt
```

### 2. Crea una rama descriptiva
```bash
git checkout -b feat/nombre-de-la-mejora
# o
git checkout -b fix/descripcion-del-bug
```

### 3. Si es una nueva funcionalidad, inicia una propuesta OpenSpec
No comiences escribiendo código a ciegas. Genera primero el delta:
```bash
python .ai-harness/skills/propose-change/runner.py mi-mejora --module MOD-core --title "Título de la mejora"
```
Rellena `proposal.md` y `tasks.md`, consolida el módulo y procede con la implementación de código y tests.

### 4. Verifica las Quality Gates localmente
Antes de hacer commit o abrir PR/MR, **las tres puertas deben devolver exit code 0**:
```bash
python .ai-harness/skills/harness-validator/runner.py
python .ai-harness/skills/preflight/runner.py --strict
python .ai-harness/skills/sync-sdd/runner.py
```

### 5. Abre tu Pull Request (GitHub) o Merge Request (GitLab)
* Completa la plantilla obligatoria generada en el PR/MR indicando el nivel de gobernanza y confirmando el checklist de validación.
* Los pipelines de **GitHub Actions** o **GitLab CI** ejecutarán las comprobaciones en un contenedor Linux aislado.

---

## 🛡️ Regla de Oro: Inmutabilidad de los Árbitros (Tamper-Resistance)

Si un validador falla:
- **CORRECTO:** Corregir la causa raíz en tu código o en tu especificación.
- **PROHIBIDO:** Modificar los scripts de validación en `.ai-harness/skills/`, relajar reglas en `.ai-harness/context/` o usar `--no-verify`.  
Las PRs/MRs que alteren los árbitros sin justificación arquitectónica documentada serán rechazadas automáticamente por el CI.

---

## 📜 Licencia

Al contribuir a este repositorio, aceptas que tus contribuciones se publicarán bajo los términos de la **Licencia MIT** incluida en el archivo [LICENSE](LICENSE).

