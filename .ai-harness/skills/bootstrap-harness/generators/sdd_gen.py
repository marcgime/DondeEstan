"""
SDD Generator: Genera la semilla inicial de especificaciones OpenSpec
(módulos vivos exhaustivos para todos los scopes en modules/ y propuesta inicial archivada en archive/).
"""

from __future__ import annotations

import re
from datetime import datetime
from models import BootstrapManifest, ScopeDefinition, StackType


class SDDGenerator:
    """Genera módulos vivos y memoria de cambios inicial en .ai-harness/sdd/."""

    def __init__(self, manifest: BootstrapManifest) -> None:
        self.manifest = manifest

    def generate_all(self) -> dict[str, str]:
        m = self.manifest
        is_flutter = m.stack.stack_type in (StackType.FLUTTER, StackType.DART)
        folder = "lib" if is_flutter else "src"
        ext = "dart" if is_flutter else "ts" if m.stack.stack_type == StackType.NODE else "py"
        test_folder = "test" if is_flutter else "tests/unit"

        today = datetime.now().strftime("%Y-%m-%d")
        month_slug = datetime.now().strftime("%Y-%m")

        specs: dict[str, str] = {
            "modules/README.md": self._modules_readme(m.scopes, folder),
            f"archive/{month_slug}-initial-setup/proposal.md": self._initial_proposal(month_slug, today),
            f"archive/{month_slug}-initial-setup/tasks.md": self._initial_tasks(m.scopes),
        }

        # Generar un módulo maestro vivo para CADA scope declarado
        generated_modules: set[str] = set()

        for scope in m.scopes:
            s_name = scope.name.lower().strip()
            if s_name in generated_modules:
                continue
            generated_modules.add(s_name)

            path_root = scope.path_roots[0] if scope.path_roots else f"{folder}/{s_name}"
            clean_path = path_root.rstrip("/")

            if s_name == "core":
                specs["modules/core.md"] = self._module_core(clean_path, ext, test_folder, today, scope)
            elif s_name == "ui":
                specs["modules/ui.md"] = self._module_ui(clean_path, ext, test_folder, today)
            else:
                specs[f"modules/{s_name}.md"] = self._module_domain(
                    scope=scope,
                    clean_path=clean_path,
                    ext=ext,
                    test_folder=test_folder,
                    today=today,
                )

        # Si no había scope 'core' explícito, garantizar al menos MOD-core
        if "core" not in generated_modules:
            specs["modules/core.md"] = self._module_core(f"{folder}/core", ext, test_folder, today)

        return specs

    def _modules_readme(self, scopes: list[ScopeDefinition], folder: str) -> str:
        m = self.manifest
        rows = []
        for s in scopes:
            path = s.path_roots[0] if s.path_roots else f"{folder}/{s.name}"
            rows.append(f"| `MOD-{s.name}` | {s.title} | `{path}` | `block_{s.name}.md` |")

        if not any(s.name == "core" for s in scopes):
            rows.insert(0, f"| `MOD-core` | Núcleo transversal y utilidades | `{folder}/core/` | `block_core.md` |")

        table_content = "\n".join(rows)

        return f"""# Catálogo de Módulos Vivos — {m.identity.name}

Este directorio contiene las especificaciones vivas de la arquitectura OpenSpec.
Cada archivo representa la única fuente de verdad funcional y contractual de su capacidad.

| Módulo ID | Nombre | Ruta de Código | Scope Asociado |
|---|---|---|---|
{table_content}
"""

    def _pascal_case(self, text: str) -> str:
        parts = re.split(r"[-_\s]+", text)
        return "".join(p.capitalize() for p in parts if p)

    def _module_core(self, clean_path: str, ext: str, test_folder: str, today: str, scope: ScopeDefinition | None = None) -> str:
        m = self.manifest
        is_python = m.stack.stack_type == StackType.PYTHON
        title = scope.title if scope else "Infraestructura Transversal y Contratos Base"
        desc = scope.description if scope else "Cliente HTTP base, contratos de persistencia, bus de eventos y utilidades transversales."

        return f"""# Módulo: {title} (MOD-core)

```yaml
module_id: MOD-core
name: "{title}"
target_path: "{clean_path}/"
scope: "block_core.md"
owner: "Architecture & Platform Team"
version: "1.0.0"
last_updated: "{today}"
```

---

## 1. Propósito y Responsabilidades

{desc}

### Lo que hace
- Concentra la coordinación transversal, contratos base e interfaces públicas de `{clean_path}/`.
- Contratos abstractos de persistencia ({m.architecture.persistence if m.architecture.persistence != 'none' else 'almacenamiento desacoplado'}).
- Modelado de excepciones tipadas y resultados inmutables (`Result[T, AppError]`).
- Bus interno de eventos y orquestación del ciclo de vida del sistema.

### Lo que NO hace
- No contiene lógica de presentación gráfica ni estilos CSS.
- No almacena secretos en texto plano ni credenciales fijas.
- No ejecuta llamadas de red sin timeout y reintentos finitos.

---

## 2. Contratos y Tipos Públicos (CT-*)

### CT-01: Contrato de Cliente HTTP Resiliente (`HttpClient`)
- **Símbolo / Archivo:** `{clean_path}/http/client.{ext}::HttpClient`
- **Firma esperada:** `request(method, url, headers, params, body) -> Result[Response, NetworkError]`
- **Invariantes:** Timeout máximo declarado por petición; política de backoff exponencial en fallos transitorios (5xx).

### CT-02: Contrato de Persistencia Abstracta (`StorageContract`)
- **Símbolo / Archivo:** `{clean_path}/storage/contract.{ext}::StorageContract`
- **Invariantes:** Operaciones de lectura y escritura idempotentes; aislamiento transaccional garantizado.

---

## 3. Reglas de Negocio e Invariantes (BR-*)

- **BR-CORE-01:** Cero excepciones no tipadas escapan a módulos de negocio. Todo error transitorio o fatal se encapsula en una jerarquía de error conocida.
- **BR-CORE-02:** Los clientes de red y persistencia no abren conexiones sin límite; deben declarar un pool finito y un timeout estricto.

---

## 4. Flujos y Ciclos de Vida

```mermaid
sequenceDiagram
    Caller->>CoreClient: executeRequest(endpoint)
    CoreClient->>Network: send()
    alt Éxito
        Network-->>CoreClient: 200 OK (Data)
        CoreClient-->>Caller: Ok(Data)
    else Fallo Transitorio
        CoreClient->>Network: retryWithBackoff()
        Network-->>CoreClient: 200 OK (Data)
        CoreClient-->>Caller: Ok(Data)
    else Fallo No Recuperable
        CoreClient-->>Caller: Err(TypedError)
    end
```

---

## 5. Mapa de implementación

| Contrato / Flujo | Símbolo de Código | Ruta en Disco | Pruebas Unitarias |
|---|---|---|---|
| CT-01 | `HttpClient` | `{clean_path}/http/client.{ext}` | `{test_folder}/core/http_client_test.{ext}` |
| CT-02 | `StorageContract` | `{clean_path}/storage/contract.{ext}` | `{test_folder}/core/storage_test.{ext}` |
"""

    def _module_domain(
        self,
        scope: ScopeDefinition,
        clean_path: str,
        ext: str,
        test_folder: str,
        today: str,
    ) -> str:
        m = self.manifest
        pascal_name = self._pascal_case(scope.name)
        desc = scope.description or scope.title
        lower_desc = desc.lower()

        # Inferencia contextual de contratos y responsabilidades según el propósito del scope
        if any(w in lower_desc for w in ("fsm", "orquestador", "daemon", "cfo", "scheduler", "ciclo")):
            entity_name = f"{pascal_name}Engine"
            contract_1_desc = f"Máquina de estados finitos y programación del ciclo ({pascal_name}State)"
            contract_2_desc = f"Controlador de eventos y transiciones ({pascal_name}EventDaemon)"
            br_1 = "Toda transición de estado es atómica e idempotente; no se duplican ciclos de ejecución."
            br_2 = "Los límites de presupuesto, timeouts y cuotas de servicio se verifican antes de transicionar."
        elif any(w in lower_desc for w in ("discovery", "sensor", "scoring", "rastreo", "scraping")):
            entity_name = f"{pascal_name}Sensor"
            contract_1_desc = f"Sensor multi-fuente de recolección de señales ({pascal_name}Candidate)"
            contract_2_desc = f"Algoritmo determinista de scoring y filtrado ({pascal_name}Scorer)"
            br_1 = "Las fuentes consultadas se procesan con rate limiting estricto para evitar bloqueos."
            br_2 = "Los candidatos que no superen el umbral mínimo de oportunidad se descartan sin generar tareas."
        elif any(w in lower_desc for w in ("build", "factory", "sandbox", "qa", "compilador", "generador")):
            entity_name = f"{pascal_name}Sandbox"
            contract_1_desc = f"Pipeline de generación y compilación de artefactos ({pascal_name}Pipeline)"
            contract_2_desc = f"Validador estático en entorno aislado Sandbox ({pascal_name}QAChecker)"
            br_1 = "Todo código o artefacto generado debe pasar las comprobaciones estáticas antes de autorizar su despliegue."
            br_2 = "La ejecución en Sandbox tiene memoria y tiempo de CPU estrictamente delimitados."
        elif any(w in lower_desc for w in ("distribution", "growth", "marketing", "seo", "cro", "envío")):
            entity_name = f"{pascal_name}Dispatcher"
            contract_1_desc = f"Adaptador de canales de distribución y entrega ({pascal_name}Channel)"
            contract_2_desc = f"Motor de optimización continua y métricas ({pascal_name}CROLoop)"
            br_1 = "Cero envíos masivos o spam sin valor contextual directo; respetar límites éticos y rate limiting."
            br_2 = "Las interacciones y eventos de conversión se registran de forma asíncrona y no invasiva."
        elif any(w in lower_desc for w in ("dashboard", "console", "metrics", "panel", "sse", "api")):
            entity_name = f"{pascal_name}Service"
            contract_1_desc = f"Emisor de eventos en tiempo real y streaming SSE ({pascal_name}StreamHandler)"
            contract_2_desc = f"Controlador de estado y operaciones de emergencia ({pascal_name}Controller)"
            br_1 = "Las peticiones de lectura deben responder en < 200 ms consumiendo agregaciones de memoria o caché."
            br_2 = "Las acciones de emergencia ([PAUSE], [KILL]) son prioritarias y tienen efecto inmediato garantizado."
        else:
            entity_name = f"{pascal_name}Service"
            contract_1_desc = f"Modelo inmutable de datos y entidades ({pascal_name}Entity)"
            contract_2_desc = f"Servicio de orquestación y reglas de negocio ({pascal_name}Service)"
            br_1 = f"Toda entidad de {scope.title} valida sus invariantes en el constructor."
            br_2 = f"Las operaciones externas que puedan fallar devuelven un Result tipado."

        return f"""# Módulo: {scope.title} (MOD-{scope.name})

```yaml
module_id: MOD-{scope.name}
name: "{scope.title}"
target_path: "{clean_path}/"
scope: "block_{scope.name}.md"
owner: "Product Engineering"
version: "1.0.0"
last_updated: "{today}"
```

---

## 1. Propósito y Responsabilidades

Es la autoridad funcional responsable de **{desc}** dentro de `{m.identity.name}`.

### Lo que hace
- Modela las entidades, estados y contratos que gobiernan {scope.title}.
- Expone interfaces públicas tipadas para su consumo por otros módulos o agentes.
- Garantiza la idempotencia y la consistencia transaccional de su subsistema.

### Lo que NO hace
- No accede directamente a la persistencia interna de otros módulos.
- No duplica utilidades de red, logging o contratos ya resueltos en `core`.
- No almacena secretos ni credenciales en código fuente.

---

## 2. Contratos y Tipos Públicos (CT-*)

### CT-01: {contract_1_desc}
- **Símbolo / Archivo:** `{clean_path}/contracts/{scope.name}_models.{ext}::{entity_name}Contract`
- **Invariantes:** Estructuras inmutables con validación estricta de esquema y tipado.

### CT-02: {contract_2_desc}
- **Símbolo / Archivo:** `{clean_path}/services/{scope.name}_service.{ext}::{pascal_name}Service`
- **Invariantes:** Métodos asíncronos con manejo de excepciones tipadas.

---

## 3. Reglas de Negocio e Invariantes (BR-*)

- **BR-{scope.name.upper()}-01:** {br_1}
- **BR-{scope.name.upper()}-02:** {br_2}

---

## 4. Flujos y Ciclos de Vida

```mermaid
sequenceDiagram
    Caller->>Service: handleRequest(payload)
    Service->>Entity: validateInvariants()
    alt Validación correcta
        Service->>CoreBus: emitEvent(event)
        Service-->>Caller: Ok(Result)
    else Fallo o límite excedido
        Service-->>Caller: Err(DomainError)
    end
```

---

## 5. Mapa de implementación

| Contrato / Flujo | Símbolo de Código | Ruta en Disco | Pruebas Unitarias |
|---|---|---|---|
| CT-01 | `{entity_name}Contract` | `{clean_path}/contracts/{scope.name}_models.{ext}` | `{test_folder}/{scope.name}/models_test.{ext}` |
| CT-02 | `{pascal_name}Service` | `{clean_path}/services/{scope.name}_service.{ext}` | `{test_folder}/{scope.name}/service_test.{ext}` |
"""

    def _module_ui(self, clean_path: str, ext: str, test_folder: str, today: str) -> str:
        m = self.manifest
        is_web = m.stack.stack_type in (StackType.NODE, StackType.PYTHON) or "Web" in m.platform.platforms

        return f"""# Módulo: Sistema de Interfaz y UI (MOD-ui)

```yaml
module_id: MOD-ui
name: "Componentes Visuales, Sistema de Diseño y Maquetación"
target_path: "{clean_path}/"
scope: "block_ui.md"
owner: "Design & Frontend Team"
version: "1.0.0"
last_updated: "{today}"
```

---

## 1. Propósito y Responsabilidades

Concentra la experiencia gráfica, los componentes reutilizables, la maquetación y la materialización de los tokens de diseño (`design-system/tokens.json`).

### Lo que hace
- Renderiza componentes respetando estrictamente los tokens del sistema.
- Proporciona accesibilidad WCAG AA y respuesta responsiva.
- Centraliza la navegación y los estados de interacción (carga, vacío, error, éxito).

### Lo que NO hace
- No realiza peticiones directas de red ni persistencia de datos (consume servicios desacoplados).
- No hardcodea colores HEX, tamaños mágicos ni márgenes fuera del sistema de diseño.

---

## 2. Contratos y Tipos Públicos (CT-*)

### CT-01: Tema y Proveedor de Tokens (`ThemeContract`)
- **Símbolo / Archivo:** `{clean_path}/theme/tokens.{ext}::ThemeTokens`
- **Invariantes:** Mapeo 1:1 con `design-system/tokens.json`.

### CT-02: Componentes Base Reutilizables (`BaseComponents`)
- **Símbolo / Archivo:** `{clean_path}/components/base.{ext}`
- **Invariantes:** Todo componente interactivo expone estados `default`, `hover`, `focus`, `disabled`.

---

## 3. Reglas de Negocio e Invariantes (BR-*)

- **BR-UI-01:** Prohibido el uso de estilos HEX o tamaños en píxeles no declarados en `tokens.json`.
- **BR-UI-02:** Los componentes deben ser 100% accesibles con contraste AA verificado.

---

## 4. Mapa de implementación

| Contrato / Flujo | Símbolo de Código | Ruta en Disco | Pruebas Unitarias |
|---|---|---|---|
| CT-01 | `ThemeTokens` | `{clean_path}/theme/tokens.{ext}` | `{test_folder}/ui/theme_parity_test.{ext}` |
| CT-02 | `BaseComponents` | `{clean_path}/components/base.{ext}` | `{test_folder}/ui/components_test.{ext}` |
"""

    def _initial_proposal(self, month_slug: str, today: str) -> str:
        m = self.manifest
        module_bullets = "\n".join([f"- **[+] Módulo:** `MOD-{s.name}` ({s.title})" for s in m.scopes])
        return f"""# Propuesta de Cambio: Inicialización del Sistema

```yaml
change_id: "{month_slug}-initial-setup"
title: "Configuración e Inicialización Base del Arnés"
module: "MOD-core"
status: CONSOLIDATED
created_at: "{today}"
consolidated_at: "{today}"
author: "bootstrap-harness"
tier: core
```

---

## 1. Motivación y Contexto

Inicialización fundacional del proyecto **{m.identity.name}** bajo metodología OpenSpec y gobernanza determinista de agentes de IA.

---

## 2. Delta de Especificación

{module_bullets}
- **[+] Límites de Escritura:** Archivos de scope contractuales en `scopes/block_*.md`.
- **[+] Calidad Determinista:** Puertas de validación automática (`harness-validator`, `preflight`, `sync-sdd`).
"""

    def _initial_tasks(self, scopes: list[ScopeDefinition]) -> str:
        tasks = [
            "- [x] Generar configuración estructural `harness.config.yaml`.",
            "- [x] Crear límites contractuales de escritura en `.ai-harness/scopes/`.",
        ]
        for s in scopes:
            tasks.append(f"- [x] Establecer especificación maestra para `MOD-{s.name}` en `modules/{s.name}.md`.")
        tasks.append("- [x] Auditar conformidad y determinismo con `harness-validator`.")
        return "# Tareas de Implementación: Inicialización Base\n\n" + "\n".join(tasks) + "\n"
