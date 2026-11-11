# Estructura del proyecto

Topología física del repositorio y responsabilidad de cada directorio. Es la
referencia contra la que se revisan los scopes.

---

## 1. Árbol

```
donde-estan/
├── .ai-harness/          # Gobernanza: contexto, scopes, SDD, memoria, skills
├── .agents/skills/       # Documentación de uso de cada skill
├── .clinerules/          # Reglas de integración y workflows
├── docs/                 # Documentación explicativa del arnés (no se copia al producto)
├── src/
│   ├── app/              # Arranque, routing, tema y composición
│   ├── core/             # Infraestructura transversal
│   └── features/         # Slices funcionales
├── test/                 # Tests unitarios y de widgets
├── integration_test/     # Flujos de extremo a extremo
├── assets/               # Recursos estáticos
├── AGENTS.md             # Enrutador operativo
├── harness.config.yaml   # Configuración estructural del arnés
├── requirements.txt      # Dependencias del tooling
└── analysis_options.yaml # Reglas de análisis estático
```

## 2. Responsabilidades

### 2.1 `.ai-harness/`

Fuente de verdad de gobernanza. No contiene código de producto. Sus validadores
son tooling, no funcionalidad.

### 2.2 `src/core/`

- `bootstrap/`: composición de dependencias y arranque.
- `theme/`: materialización de los tokens de diseño.
- `routing/`: rutas y transiciones de alto nivel.
- `lifecycle/`: observadores del ciclo de vida.

No contiene lógica de features.

### 2.3 `src/core/`

- Cliente HTTP base y política de reintentos.
- Contratos de almacenamiento y caché compartidos.
- Logger, errores tipados, constantes y utilidades puras.

No conoce features concretas ni widgets.

### 2.4 `src/features/<feature>/`

```
<feature>/
├── domain/          # Entidades, contratos y casos de uso
├── data/            # DTOs, fuentes y repositorios
├── application/     # Controladores sin interfaz
└── presentation/    # Pantallas, widgets y controladores de UI
```

- Único lugar donde se implementan las reglas de esa feature.
- Único lugar donde se accede a su persistencia.
- No importa las tripas de otra feature.

### 2.5 `test/` y `integration_test/`

- `test/`: unitarios de dominio y datos; widgets de presentación.
- `integration_test/`: flujos completos con dependencias reales o simuladas.
- Prohibido usar red real o temporizadores reales en `test/`.

### 2.6 `assets/`

- Fuentes, imágenes y datos semilla.
- Prohibido incluir binarios pesados o contenido sin licencia clara.

## 3. Reglas de dependencia

- `app` puede importar cualquier feature y `core`.
- Una feature puede consumir la API pública de otra, nunca sus internals.
- `core` no importa features.
- Ninguna feature importa `app`.
- Prohibidas las dependencias circulares.

## 4. Convenciones de archivo

- Nombres en `snake_case` para archivos y `PascalCase` para tipos.
- Una clase pública principal por archivo.
- Barrel file por feature: `src/features/<feature>/<feature>.dart`.
- DTOs en `data/models/`; entidades en `domain/entities/`.
- Contratos en `domain/repositories/` y `domain/services/`.
- Widgets reutilizables en `presentation/widgets/`.

## 5. Prohibiciones de estructura

- Carpetas `backend/` o `server/` dentro de `src/`.
- Lógica de negocio en el punto de entrada o en `app/`.
- Acceso a persistencia desde `presentation/`.
- Importar un paquete de UI fuera de la capa de presentación.
- Incluir binarios pesados en el bundle.
