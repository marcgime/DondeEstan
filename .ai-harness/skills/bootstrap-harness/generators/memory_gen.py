"""
Memory Generator: Genera la memoria preventiva, catálogo exhaustivo de modos de fallo con anti-patrones
(Código incorrecto de IA vs Código canónico esperado) y ADRs técnicos con trade-offs completos.
"""

from __future__ import annotations

from models import BootstrapManifest, StackType


class MemoryGenerator:
    """Genera .ai-harness/memory/ con catálogo de fallos y ADRs exhaustivos."""

    def __init__(self, manifest: BootstrapManifest) -> None:
        self.manifest = manifest

    def generate_all(self) -> dict[str, str]:
        files: dict[str, str] = {
            "failure_modes.md": self._failure_modes(),
            "decisions/README.md": self._decisions_readme(),
            "decisions/ADR-0001-stack-base.md": self._adr_0001(),
            "decisions/ADR-0002-clean-architecture.md": self._adr_0002(),
            "decisions/ADR-0003-persistence-strategy.md": self._adr_0003(),
            "ephemeral_feedback/README.md": self._ephemeral_readme(),
        }
        return files

    def _decisions_readme(self) -> str:
        return """# Decisiones de arquitectura (ADR)

Cada decisión estructural relevante se registra aquí como un documento corto, inmutable y numerado.

## Convención

```
decisions/
├── README.md
├── ADR-0001-<slug>.md
├── ADR-0002-<slug>.md
└── ADR-0003-<slug>.md
```

## Reglas

- Un ADR describe Contexto, Decisión, Consecuencias positivas y negativas, y Alternativas descartadas.
- Un ADR no se reescribe: si la decisión cambia, se crea otro ADR que la reemplaza formalmente.
"""

    def _ephemeral_readme(self) -> str:
        return """# Ephemeral Feedback

Directorio para almacenar logs temporales de ejecución y fallos de validación.
Estos archivos no forman parte de la arquitectura del producto ni se commitean.
"""

    def _failure_modes(self) -> str:
        m = self.manifest
        items = []

        # 1. Si el manifiesto o brief entregó modos de fallo específicos del dominio, priorizarlos absolutamente
        if m.failure_modes:
            for fm in m.failure_modes:
                code_block = ""
                if fm.bad_code or fm.good_code:
                    code_block = f"""
### Ejemplo de Anti-patrón vs Patrón Canónico
```
// ❌ INCORRECTO (Antipatrón típico de IA):
{fm.bad_code}

// ✅ CORRECTO (Canónico):
{fm.good_code}
```
"""
                items.append(f"""## {fm.id}: {fm.title}

- **Síntoma observable:** {fm.symptom}
- **Causa raíz técnica (trampa típica de IA):** {fm.root_cause}
{code_block}
- **Mitigación obligatoria y verificación:** {fm.mitigation}
""")
        else:
            # 2. Catálogo canónico por defecto adaptado estrictamente al stack y arquetipo
            is_python = m.stack.stack_type == StackType.PYTHON
            is_node = m.stack.stack_type == StackType.NODE
            is_flutter = m.stack.stack_type in (StackType.FLUTTER, StackType.DART)

            if is_python:
                modes = [
                    (
                        "FM-001",
                        "Tipado Dinámico no Seguro y Acceso Ciego a Diccionarios",
                        "Uso de diccionarios planos `dict[str, Any]` sin esquemas Pydantic o tipos `Any` en contratos.",
                        "La IA evita modelar clases inmutables y recurre a dicts genéricos propensos a KeyErrors en runtime.",
                        """# ❌ INCORRECTO:
def process_payload(data: dict) -> dict:
    user_id = data["user_id"] # KeyError si no viene

# ✅ CORRECTO:
class UserPayload(BaseModel, frozen=True):
    user_id: str
    email: EmailStr

def process_payload(data: UserPayload) -> ProcessResult:""",
                        "El check 02_contracts y mypy analizan firmas públicas y prohíben `Any` en capas de dominio."
                    ),
                    (
                        "FM-002",
                        "Bloqueo del Event Loop con I/O Síncrono en Funciones Async",
                        "Llamadas a `requests.get()` o `time.sleep()` dentro de endpoints o corrutinas de FastAPI/asyncio.",
                        "La IA mezcla librerías síncronas bloqueando la concurrencia del servidor.",
                        """# ❌ INCORRECTO:
import time, requests
async def fetch_data():
    time.sleep(1) # Bloquea el event loop completo
    return requests.get(url).json()

# ✅ CORRECTO:
import asyncio, httpx
async def fetch_data():
    await asyncio.sleep(1)
    async with httpx.AsyncClient() as client:
        return (await client.get(url)).json()""",
                        "Auditoría de linter en preflight y pruebas unitarias de concurrencia."
                    ),
                    (
                        "FM-003",
                        "Código de Producción sin Spec Aprobada (Bypass de SDD)",
                        "Creación o edición de archivos en `src/` sin una propuesta en `changes/` o módulo vivo en `modules/`.",
                        "La IA asume requerimientos o intenta programar directamente sin pasar por el ciclo SDD-First.",
                        """# ❌ INCORRECTO:
# Escribir src/feature/service.py sin propuesta ni módulo previo

# ✅ CORRECTO:
# 1. Ejecutar /propose-change.md o Fast-Path (<3 archivos)
# 2. Revisar propuesta y consolidar con /consolidate-change.md
# 3. Implementar en src/feature/service.py""",
                        "El validador `sync-sdd` y `harness-validator` bloquean código huérfano de spec."
                    ),
                    (
                        "FM-004",
                        "Captura Silenciosa de Excepciones y Pérdida de Trazas",
                        "Bloques `try/except: pass` o `except Exception` sin tipado ni re-lanzamiento controlado.",
                        "La IA busca suprimir errores a toda costa dejando el sistema en estado zombi.",
                        """# ❌ INCORRECTO:
try:
    await db.save(record)
except Exception:
    pass # Error silenciado

# ✅ CORRECTO:
try:
    await db.save(record)
except DatabaseConnectionError as err:
    logger.error("Fallo persistiendo %s: %s", record.id, err)
    raise RecordPersistenceError(f"No se pudo guardar {record.id}") from err""",
                        "El linter de `preflight` prohíbe bloques except vacíos y prints sin logger."
                    ),
                    (
                        "FM-005",
                        "Violación de Tokens Visuales con Estilos Literales",
                        "Colores HEX, constantes o dimensiones numéricas directas en componentes o plantillas de UI.",
                        "La IA introduce estilos inline (`style='color: #06b6d4'`) sin consumir `tokens.json` o clases de diseño.",
                        """<!-- ❌ INCORRECTO: -->
<div style="background-color: #0b0f19; padding: 14px;">

<!-- ✅ CORRECTO: -->
<div class="bg-brand-background-primary p-md">""",
                        "El check 04_ui_tokens de `preflight` detecta valores HEX directos en archivos de presentación."
                    ),
                ]
            else:
                modes = [
                    (
                        "FM-001",
                        "Violación de Tokens de Diseño con Estilos Literales",
                        "Colores HEX, constantes o dimensiones numéricas directas en componentes de UI.",
                        "La IA genera estilos rápidos inventando `#2563EB`, márgenes mágicos o colores literales.",
                        """// ❌ INCORRECTO:
<div style={{ color: "#1E40AF", margin: "12px" }}>

// ✅ CORRECTO:
<div className="text-brand-primary m-md">""",
                        "El check 04_ui_tokens de `preflight` rastrea expresiones regulares de color y bloquea el commit."
                    ),
                    (
                        "FM-002",
                        "Código de Producción sin Spec Aprobada (Bypass de SDD)",
                        "Creación o edición de archivos sin propuesta previa en `changes/` o módulo en `modules/`.",
                        "La IA intenta programar directamente sin pasar por el ciclo SDD-First.",
                        """// ❌ INCORRECTO:
// Escribir src/feature/service.ts sin spec previa

// ✅ CORRECTO:
// 1. Ejecutar /propose-change.md o aplicar Fast-Path (<3 archivos)
// 2. Consolidar con /consolidate-change.md
// 3. Implementar código""",
                        "El validador `sync-sdd` y `harness-validator` reportan error fatal ante código no referenciado."
                    ),
                    (
                        "FM-003",
                        "Fugas de Tipado Dinámico o Genérico en Contratos",
                        "Uso de `any` o tipos comodín en entidades y contratos de dominio.",
                        "La IA relaja los tipos para evitar errores inmediatos de compilación.",
                        """// ❌ INCORRECTO:
function processData(data: any): any;

// ✅ CORRECTO:
function processData(data: ImmutableContract): DomainResult;""",
                        "El check 02_contracts de `preflight` analiza el tipado y rechaza tipos no seguros."
                    ),
                    (
                        "FM-004",
                        "Captura Silenciosa de Errores y Excepciones Huérfanas",
                        "Bloques `try/catch` vacíos o con logging informal (`console.log`) que ocultan fallos.",
                        "La IA intenta que una función no arroje error dejando el sistema en estado corrupto.",
                        """// ❌ INCORRECTO:
try { await repo.save(item); } catch (e) {}

// ✅ CORRECTO:
try {
  await repo.save(item);
} catch (err) {
  logger.error("Error guardando item", { error: err });
  throw new StorageFailure(err);
}""",
                        "El linter de `preflight` detecta bloques catch vacíos y prohíbe `console.log` en producción."
                    ),
                    (
                        "FM-005",
                        "Invasión de Fronteras e Importación Interna entre Módulos",
                        "Un módulo importa submódulos privados de otro módulo.",
                        "La IA reutiliza código interno sin respetar el desacoplamiento vertical.",
                        """// ❌ INCORRECTO:
import { PrivateDao } from "../billing/internal/dao";

// ✅ CORRECTO:
import { BillingPublicApi } from "../billing";""",
                        "El check 01_architecture de `preflight` verifica la matriz de imports entre módulos."
                    ),
                ]

            for fmid, title, symptom, root_cause, code_sample, mitigation in modes:
                items.append(f"""## {fmid}: {title}

- **Síntoma observable:** {symptom}
- **Causa raíz técnica (trampa típica de IA):** {root_cause}

### Ejemplo de Anti-patrón vs Patrón Canónico
```
{code_sample}
```

- **Mitigación obligatoria y verificación:** {mitigation}
""")

        return f"""# Catálogo de Modos de Fallo — {m.identity.name}

Memoria preventiva de errores, sesgos y asunciones incorrectas que los agentes de IA no deben repetir.
Cada modo de fallo documenta la causa raíz técnica, el contraste de código y el guardarraíl de verificación.

---

{chr(10).join(items)}
"""

    def _adr_0001(self) -> str:
        m = self.manifest
        # Si el manifiesto provee ADR-0001 específico con contenido real, usarlo
        if m.adr_0001 and len(m.adr_0001.context) > 20:
            return f"""# {m.adr_0001.id}: {m.adr_0001.title}

- **Estado:** {m.adr_0001.status}
- **Fecha:** Inicialización del proyecto
- **Decisores:** Equipo de arquitectura

## Contexto
{m.adr_0001.context}

## Decisión
{m.adr_0001.decision}

## Consecuencias
{m.adr_0001.consequences}
"""

        return f"""# ADR-0001: Elección de Stack Base ({m.stack.language} / {m.stack.framework})

- **Estado:** Aceptada
- **Fecha:** Inicialización del proyecto
- **Decisores:** Equipo de arquitectura

## Contexto
Para construir {m.identity.name} ({m.identity.description}), orientada a {m.identity.target_audience}, se requiere un stack tecnológico que ofrezca alto rendimiento, tipado estricto en tiempo de compilación y soporte determinista para las plataformas objetivo ({', '.join(m.platform.platforms)}).

## Decisión
Adoptar **{m.stack.language}** con el framework **{m.stack.framework}** y gestor de dependencias `{m.stack.package_manager}`.

## Alternativas consideradas
1. **Solución basada en scripts dinámicos:** Descartada por carecer de verificación de tipos robusta para arquitecturas guiadas por contratos.
2. **Frameworks monolíticos pesados:** Descartados por sobrecarga de runtime o costes fijos de servidor no deseados.

## Consecuencias
- **Positivas:** Compilación optimizada, tooling moderno, fuerte ecosistema y soporte para desarrollo guiado por contratos SDD.
- **Negativas:** Se exige cumplimiento estricto del linter y verificación en `preflight` para evitar malas prácticas del lenguaje.
"""

    def _adr_0002(self) -> str:
        m = self.manifest
        return f"""# ADR-0002: Adopción de {m.architecture.style} y Aislamiento Modular

- **Estado:** Aceptada
- **Fecha:** Inicialización del proyecto
- **Decisores:** Equipo de arquitectura

## Contexto
El sistema crecerá modularmente con múltiples bloques funcionales ({', '.join([s.name for s in m.scopes])}). Permitir que la presentación acceda directamente a bases de datos o que los servicios dependan de detalles de I/O privados genera deuda técnica insostenible y acoplamiento severo ante modificaciones de agentes de IA.

## Decisión
Implementar **{m.architecture.style}** estricta:
1. El dominio es puro, inmutable y no depende de frameworks externos ni de almacenamiento físico.
2. La infraestructura implementa interfaces definidas en el dominio.
3. Las features no importan código interno de otras features; toda comunicación es por contratos de API pública.

## Consecuencias
- **Positivas:** Testabilidad del 100 % del dominio sin mocks complejos, aislamiento ante cambios de librerías y menor propensión a errores de agentes de IA.
- **Negativas:** Mayor número inicial de archivos y necesidad de mapear DTOs a entidades inmutables.
"""

    def _adr_0003(self) -> str:
        m = self.manifest
        return f"""# ADR-0003: Estrategia de Persistencia y Caché ({m.architecture.persistence})

- **Estado:** Aceptada
- **Fecha:** Inicialización del proyecto
- **Decisores:** Equipo de arquitectura

## Contexto
{m.identity.name} requiere una estrategia de almacenamiento de datos conforme a su modelo de persistencia: `{m.architecture.persistence}`. Debe garantizarse atomicidad, velocidad de lectura en frío y cero fugas de descriptores de conexión.

## Decisión
Adoptar almacenamiento desacoplado mediante el patrón Repository / Adaptador:
- Las entidades de negocio se persisten a través de contratos de repositorio tipados.
- Si es almacenamiento local o serverless ({m.architecture.persistence}), se prioriza la consistencia y la velocidad de consulta en disco o edge.
- Se aísla el motor de persistencia dentro de la capa transversal o propietaria correspondiente.

## Consecuencias
- **Positivas:** Capacidad de sustituir o actualizar el motor de base de datos sin tocar la lógica de negocio.
- **Negativas:** Se deben mantener migraciones de esquema versionadas y tests de integración deterministas.
"""
