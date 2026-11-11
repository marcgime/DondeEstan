# Gobernanza del arnés

Reglas del propio arnés `.ai-harness/`. No describe el producto: para eso están
`project_overview.md`, `architecture_rules.md` y el resto del contexto.

---

## 1. Propósito y autoridad

El arnés existe para que cualquier agente o desarrollador pueda:

- saber qué reglas son inmutables;
- saber dónde puede escribir y dónde no;
- encontrar la spec de lo que va a implementar;
- validar que código y especificación no divergen;
- no repetir errores ya conocidos.

`AGENTS.md` es el enrutador. Este documento es la constitución del arnés.

## 2. Mapa de directorios

| Directorio | Contenido |
|---|---|
| `context/` | Verdad de producto, arquitectura, diseño, seguridad y gobernanza |
| `design-system/` | Fundamentos, tokens, layout, componentes, páginas y mapeo |
| `scopes/` | Límites de escritura por bloque |
| `sdd/` | Especificaciones e historias de usuario |
| `memory/` | Modos de fallo, decisiones y feedback efímero |
| `skills/` | Skills ejecutables y manifiestos |
| `fixtures/` | Datos deterministas para pruebas |
| `.clinerules/` | Reglas de workspace y workflows invocables |
| `.agents/` | Documentación de uso de cada skill |

Regla: un archivo vive en un único lugar. Prohibido duplicar reglas, skills o
manifiestos en dos árboles.

## 3. Configuración

`harness.config.yaml`, en la raíz del repositorio, declara la estructura que los
validadores exigen: contextos obligatorios, scopes, prefijos de spec, front
matter, prefijo de modos de fallo y perfiles de invariantes.

- Si el archivo falta, los validadores fallan con error explícito.
- Un cambio de estructura empieza en la configuración, no en el código del check.
- La configuración no contiene reglas de negocio: eso vive en `context/`.

## 4. Orden de carga

1. `system_identity.md`
2. `harness_governance.md`
3. `project_overview.md`
4. `architecture_rules.md`
5. `ui-design-system.md` y `design-system/README.md`
6. `scopes/block_<área>.md`
7. `sdd_framework.md`
8. El módulo vivo `.ai-harness/sdd/modules/<modulo>.md` y la propuesta en `changes/` activa, si existe
9. `memory/failure_modes.md`

Si falta cualquier pieza para la tarea, el agente se detiene y lo dice.

## 5. Jerarquía de verdad

1. `context/` y `scopes/`.
2. Módulo vivo consolidado en `modules/` y propuesta activa en `changes/`.
3. Contratos y código.
4. Documentación auxiliar.

Si el código contradice la spec del módulo, el código está mal. Si el módulo contradice el
contexto, el módulo está mal. La contradicción no se resuelve inventando una
tercera regla.

## 6. Convenciones de nombre

- Módulos vivos: `MOD-<slug>` en `.ai-harness/sdd/modules/<slug>.md`.
- Propuestas de cambio: `[YYYY-MM]-<slug>` en `.ai-harness/sdd/changes/`.
- Scopes: `block_<área>.md`.
- Skills: `<nombre>/skill.yaml`, `<nombre>/runner.py`, `.agents/skills/<nombre>/SKILL.md`.
- Modos de fallo: `<prefijo>-NNN`, con el prefijo declarado en la configuración.

## 7. Reglas de skills

Cada skill debe tener:

1. `skill.yaml` con `name`, `version`, `description`, `command`, `inputs` y `outputs`.
2. Un runner ejecutable y determinista.
3. Documentación en `.agents/skills/<nombre>/SKILL.md`.
4. Entrada en `skills/registry.yaml`.
5. Un comando de verificación o test cuando aplique.

Prohibido: skills fantasma sin runner, dos runners para la misma skill, runners
que impriman éxito sin ejecutar la acción y skills que dependan de servicios
externos no declarados.

## 8. Puertas de validación

| Puerta | Valida | Cuándo |
|---|---|---|
| `harness-validator` | Estructura del arnés: contexto, scopes, memoria, SDD, skills | Antes de cerrar cualquier cambio |
| `preflight` | Código, arquitectura, contratos, tokens y dependencias | Antes de cerrar cambios de producto |
| `sync-sdd` | Módulo vivo ↔ target ↔ tareas completadas en changes/ | Antes de publicar o cerrar un cambio |
| `git-publish` | Ambas puertas antes de publicar | Solo bajo petición explícita |

Un fallo de validación no se ignora ni se desactiva: se corrige la causa raíz.

## 9. Herramientas y lenguajes

- **Producto:** el stack declarado en `platform_matrix.md`.
- **Tooling del arnés:** Python 3.11 o superior para validadores, runners y
  automatización. Dependencias declaradas en `requirements.txt`.
- Prohibido mezclar el lenguaje del producto con el del tooling en el mismo
  directorio de código.

## 10. Cambio, deprecación y limpieza

- Toda regla nueva se añade a `context/` o a un scope, no a `AGENTS.md`.
- Toda skill nueva se registra en `skills/registry.yaml`.
- Todo cambio se consolida en el módulo maestro de `modules/` y se archiva en `archive/`.
- Toda skill obsoleta se marca `deprecated` y se retira tras migrar sus referencias.
- Prohibido dejar directorios vacíos, archivos huérfanos o documentación de otro
  proyecto.
- Los logs de fallo van a `memory/ephemeral_feedback/`, nunca a `fixtures/`.

## 11. Definition of Done del arnés

- [ ] `harness-validator` devuelve exit code 0.
- [ ] `preflight` devuelve exit code 0 o un warning justificado.
- [ ] `sync-sdd` audita módulos vivos y tareas en curso sin divergencias.
- [ ] Cada skill tiene manifiesto, runner, documentación y registro.
- [ ] Cada scope apunta a una ruta existente declarada en la configuración y declara rutas prohibidas.
- [ ] Cada módulo vivo en `modules/` tiene `module_id`, `target_path`, `scope` y `Mapa de implementación`.
- [ ] Las propuestas en curso tienen `proposal.md` y `tasks.md` sin tareas incompletas al cerrar.
- [ ] No hay referencias al proyecto anterior ni a sus tecnologías.
- [ ] No hay dos fuentes de verdad para la misma regla.

## 12. Auditoría periódica

Antes de cada release:

1. Buscar términos heredados en `context/`, `scopes/`, `AGENTS.md` y `skills/`
   usando `legacy_terms` de la configuración.
2. Comparar los scopes con `project_structure.md`.
3. Comparar `skills/registry.yaml` con los `skill.yaml` reales.
4. Verificar que cada spec tiene target y pruebas.
5. Verificar que `AGENTS.md` solo enruta y no duplica reglas.
