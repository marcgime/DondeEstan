"""
Template-Driven Context Generator: Genera los 12 documentos de .ai-harness/context/
utilizando las plantillas maestras del lanzador y garantizando soberanía e idempotencia
cuando se suministran especificaciones personalizadas (custom_context_overrides).
"""

from __future__ import annotations

import re
from pathlib import Path
from models import BootstrapManifest, ProductArchetype, StackType


class ContextGenerator:
    """Genera los 12 documentos normativos a partir de las plantillas existentes."""

    def __init__(self, manifest: BootstrapManifest, harness_dir: Path | None = None) -> None:
        self.manifest = manifest
        # Las plantillas canónicas siempre se cargan desde el núcleo del lanzador para evitar leer archivos ya mutados
        launcher_root = Path(__file__).resolve().parents[3]
        self.canonical_template_dir = launcher_root / "context"
        self.harness_dir = Path(harness_dir).resolve() if harness_dir else launcher_root

    def generate_all(self) -> dict[str, str]:
        docs = [
            "system_identity.md",
            "harness_governance.md",
            "project_overview.md",
            "architecture_rules.md",
            "project_structure.md",
            "coding_standards.md",
            "testing_guidelines.md",
            "security_privacy.md",
            "platform_matrix.md",
            "glossary.md",
            "sdd_framework.md",
            "ui-design-system.md",
        ]

        result: dict[str, str] = {}
        for doc in docs:
            # 1. Leer siempre la plantilla canónica limpia
            template_path = self.canonical_template_dir / doc
            base_template = ""
            if template_path.exists():
                base_template = template_path.read_text(encoding="utf-8", errors="ignore")

            # 2. Si existe un override específico en el manifiesto
            if doc in self.manifest.custom_context_overrides and self.manifest.custom_context_overrides[doc].strip():
                override_text = self.manifest.custom_context_overrides[doc].strip()
                result[doc] = self._handle_custom_override(doc, override_text, base_template)
                continue

            # 3. De lo contrario, interpolar la plantilla canónica limpia
            if base_template:
                result[doc] = self._interpolate_template(doc, base_template)
            else:
                result[doc] = f"# {doc}\n\nDocumento normativo del proyecto {self.manifest.identity.name}.\n"

        return result

    def _resolve_common_vars(self, content: str) -> str:
        m = self.manifest
        content = content.replace("<PROYECTO>", m.identity.name)
        content = content.replace("<proyecto>", m.identity.slug)
        content = content.replace("<plataformas>", ", ".join(m.platform.platforms))
        content = content.replace("<stack>", f"{m.stack.language} {f'({m.stack.framework})' if m.stack.framework else ''}")
        return content

    def _handle_custom_override(self, doc_name: str, override_text: str, base_template: str) -> str:
        """Procesa un override aportado en el manifiesto garantizando soberanía sin duplicaciones."""
        m = self.manifest
        resolved = self._resolve_common_vars(override_text)

        # Caso especial 1: Glosario (Fusión limpia de términos de dominio con términos del arnés)
        if doc_name == "glossary.md":
            # Extraer únicamente los bullets o términos definidos en el override
            domain_lines = []
            for line in resolved.splitlines():
                stripped = line.strip()
                if stripped.startswith(("#", "---")):
                    continue
                if stripped.startswith(("-", "*")) or (":" in stripped and len(stripped) > 5):
                    domain_lines.append(line)

            domain_section = "\n".join(domain_lines).strip()
            interpolated_base = self._interpolate_template(doc_name, base_template)

            if domain_section:
                placeholder_regex = r"## 5\. Términos de producto[\s\S]*?(?=## 6|\Z)"
                replacement = f"## 5. Términos de Dominio y Producto ({m.identity.name})\n\n{domain_section}\n\n"
                if re.search(placeholder_regex, interpolated_base):
                    return re.sub(placeholder_regex, replacement, interpolated_base)
                return f"{interpolated_base}\n\n## 5. Términos de Dominio ({m.identity.name})\n\n{domain_section}\n"
            return interpolated_base

        # Caso especial 2: Coding Standards (Preserva estándares y añade disciplina transversal si falta)
        if doc_name == "coding_standards.md":
            if "Estándares Transversales y Disciplina de Calidad" not in resolved:
                resolved += f"""

---

## 3. Estándares Transversales y Disciplina de Calidad

- **Trazabilidad de Símbolos:** Todo símbolo público relevante lleva comentario de trazabilidad hacia su contrato en OpenSpec:
  `/// Spec: MOD-<modulo> / CT-<id>`
- **Cero Excepciones Huérfanas:** Las funciones públicas de servicio capturan errores de bajo nivel y devuelven tipos cerrados o excepciones tipadas de dominio.
- **Tipado Estricto:** Prohibido el uso de tipos genéricos dinámicos (`Any`, `dynamic`, `unknown`) en contratos públicos.
- **Formateo y Linters:** El código debe superar sin advertencias la ejecución de las herramientas estáticas del lenguaje (`ruff/mypy` en Python, `eslint` en TypeScript/Node, `dart analyze` en Dart).
- **Pruebas de Regresión:** Todo fallo o bug detectado requiere al menos un test unitario que lo reproduzca antes de aplicar la corrección.
"""
            return resolved

        # Caso especial 3: Security & Privacy (Preserva reglas y asegura gestión de secretos si falta)
        if doc_name == "security_privacy.md":
            if "Gestión y Rotación de Secretos" not in resolved:
                resolved += f"""

---

## 3. Gestión y Rotación de Secretos

- **Variables de Entorno:** Las credenciales nunca se compilan en imágenes ni se versionan en Git; viven en `.env` local (ignorado en `.gitignore`).
- **Rotación Inmediata:** Si un secreto se expone accidentalmente, se invalida de inmediato en el proveedor, se rota y se documenta un ADR de remediación.
- **Principio de Mínimo Privilegio:** Los tokens de APIs externas se generan con permisos acotados exclusivamente a los recursos necesarios.
- **Auditoría de Dependencias:** No se admiten paquetes con vulnerabilidades conocidas (CVE) ni librerías de telemetría invasiva.
"""
            return resolved

        # Caso especial 4: Architecture Rules (Soberano; añade paquetes prohibidos si no estaban en el texto)
        if doc_name == "architecture_rules.md":
            if m.architecture.forbidden_packages and "Paquetes Prohibidos" not in resolved:
                resolved += "\n\n## 4. Paquetes Prohibidos por Diseño\n\nQueda formalmente prohibida la inclusión de las siguientes dependencias:\n"
                for pkg in m.architecture.forbidden_packages:
                    resolved += f"- `{pkg}`\n"
            return resolved

        # Para cualquier otro documento con override: es soberano y no se concatena con la plantilla base
        return resolved

    def _interpolate_template(self, doc_name: str, template: str) -> str:
        m = self.manifest
        is_flutter = m.stack.stack_type in (StackType.FLUTTER, StackType.DART)
        folder = "lib" if is_flutter else "src"

        content = self._resolve_common_vars(template)

        # Adaptaciones especializadas según el documento
        if doc_name == "project_overview.md":
            content = content.replace("<una frase que describa el producto y su usuario principal>", m.identity.description)
            content = content.replace("<qué problema resuelve y por qué esta solución es mejor que la alternativa actual>", m.identity.description)
            module_rows = "\n".join([f"| `{s.name}` | {s.description} | `{s.path_roots[0] if s.path_roots else folder + '/' + s.name}` |" for s in m.scopes])
            content = re.sub(
                r"\|\s*<módulo A>[\s\S]*?\|\s*<módulo C>.*?\n",
                module_rows + "\n",
                content,
            )

        elif doc_name == "architecture_rules.md":
            # Adaptar rutas y capas para stacks no-Flutter
            if not is_flutter:
                content = content.replace("lib/app/", f"{folder}/core/")
                content = content.replace("lib/core/", f"{folder}/core/")
                content = content.replace("lib/features/", f"{folder}/features/")
                content = content.replace("lib/", f"{folder}/")
                content = content.replace("widgets", "componentes o endpoints")

            if m.architecture.forbidden_packages and "Paquetes Prohibidos" not in content:
                content += "\n\n## 7. Paquetes Prohibidos por Diseño\n\nQueda formalmente prohibida la inclusión de las siguientes dependencias:\n"
                for pkg in m.architecture.forbidden_packages:
                    content += f"- `{pkg}`\n"

        elif doc_name == "project_structure.md":
            if not is_flutter:
                content = content.replace("lib/app/", f"{folder}/core/")
                content = content.replace("lib/core/", f"{folder}/core/")
                content = content.replace("lib/features/", f"{folder}/features/")
                content = content.replace("lib/", f"{folder}/")

        elif doc_name == "ui-design-system.md":
            if not m.ui.has_ui:
                return f"""# Directriz de Diseño y Contratos — {m.identity.name}

> **Nota:** Este producto es un `{m.identity.archetype.value}` sin interfaz gráfica de usuario.

---

## 1. Alcance
No aplica sistema de diseño visual ni tokens de color o tipografía. La disciplina de diseño en este proyecto se rige por:
- Consistencia en contratos de API (REST, gRPC, CLI).
- Nomenclatura unificada de campos JSON y respuestas tipadas.
- Mensajes de error legibles y estructurados según RFC 7807 o estándar equivalente.
"""
            if not m.ui.focus_navigation_required:
                content = content.replace("D-Pad / Mando a distancia (si aplica a TV o consolas)", "Navegación táctil y por teclado estándar según WCAG")
                content = content.replace("- Todo elemento interactivo es alcanzable con flechas o D-Pad.", "- Todo elemento interactivo es alcanzable con teclado (Tab/Shift+Tab) o interacción táctil/ratón según WCAG AA.")
                content = content.replace("D-Pad", "Teclado y Táctil")

        elif doc_name == "platform_matrix.md":
            rows = "\n".join([f"| **{p}** | Versión estable moderna | Compilación nativa optimizada | Hardware estándar |" for p in m.platform.platforms])
            content = re.sub(r"\|\s*<Plataforma A>[\s\S]*?\|\s*<Plataforma C>.*?\n", rows + "\n", content)

        return content
