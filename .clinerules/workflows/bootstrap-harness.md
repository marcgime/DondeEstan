# Workflow — Inicialización y Adaptación del Arnés (Bootstrap)

## Propósito

Inicializa o adapta todo el arnés para un nuevo proyecto a partir de documentación previa en `.ai-harness/input/`, del análisis del código existente o mediante entrevista guiada asistida por el modelo de IA.

---

## Protocolo Asistido por Modelo de IA (Recomendado)

Cuando el agente de IA colabora con el usuario para montar el arnés:

1. **Paso 1: Ingesta del Dominio Real**
   - El agente lee la documentación depositada en `.ai-harness/input/` (o le pide al usuario una breve explicación del producto).
   - Extrae:
     - Nombre y propuesta de valor.
     - Stack tecnológico real (`Python`, `Node/TypeScript`, `Flutter/Dart`, `Go`).
     - Arquetipo: `GUI_APP`, `BACKEND_API`, `CLI_TOOL`, `LIBRARY`.
     - Features/Módulos reales del negocio (ej. `auth`, `catalog`, `orders`).
     - Identidad visual / tokens reales (si existen) o especificación de que no aplica UI.

2. **Paso 2: Generación del Manifiesto Enriquecido**
   - En lugar de forzar preguntas rígidas por terminal, la IA redacta un archivo de manifiesto canónico en `.ai-harness/input/manifest.yaml` con toda la información técnica real.

3. **Paso 3: Compilación Atómica**
   - El agente lanza la generación automática:
   ```bash
   python .ai-harness/skills/bootstrap-harness/runner.py --manifest .ai-harness/input/manifest.yaml
   ```
   - El compilador toma los archivos `.md` de `.ai-harness/context/`, `design-system/`, `scopes/` y `sdd/templates/` como **plantillas vivas**, interpolando y personalizando cada uno con la información del manifiesto sin inventar valores.

4. **Paso 4: Verificación Inmediata**
   - El runner ejecuta automáticamente las puertas de calidad:
   ```bash
   python .ai-harness/skills/harness-validator/runner.py
   python .ai-harness/skills/preflight/runner.py
   python .ai-harness/skills/sync-sdd/runner.py
   ```
   - Todas las puertas deben devolver código de salida `0` (`PASSED`).

---

## Modo Manual Interactivo (Terminal)

Para desarrolladores que prefieran responder manualmente por consola:
```bash
python .ai-harness/skills/bootstrap-harness/runner.py --interactive
```

---

## Reglas de Gobernanza

- **Cero Invención:** Prohibido inventar colores, tipografías o paquetes que no hayan sido proporcionados por el usuario o extraídos del PRD.
- **SDD-First:** Las specs semilla iniciales se generan con todas las secciones de las plantillas canónicas completas.
- **AGENTS.md:** Se mantiene estrictamente como router sin reglas de negocio embebidas.
- **Git Push:** Solo se publica bajo instrucción explícita del usuario.
