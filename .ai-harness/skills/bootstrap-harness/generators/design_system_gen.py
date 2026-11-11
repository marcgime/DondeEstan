"""
Template-Driven Design System Generator: Genera .ai-harness/design-system/ y tokens.json
utilizando los archivos Markdown y tokens.json existentes como base viva, inyectando
los tokens y decisiones reales recuperadas del brief/PRD por el modelo de IA.
"""

from __future__ import annotations

import json
from pathlib import Path
from models import BootstrapManifest, StackType


class DesignSystemGenerator:
    """Genera la suite de diseño a partir de las plantillas existentes."""

    def __init__(self, manifest: BootstrapManifest, harness_dir: Path | None = None) -> None:
        self.manifest = manifest
        self.harness_dir = Path(harness_dir).resolve() if harness_dir else Path(__file__).resolve().parents[3]
        self.ds_template_dir = self.harness_dir / "design-system"

    def generate_all(self) -> dict[str, str]:
        m = self.manifest
        if not m.ui.has_ui:
            return {
                "README.md": f"# Sistema de Diseño y Contratos — {m.identity.name}\n\nEste producto es un `{m.identity.archetype.value}` sin interfaz gráfica. No aplica tokens.json visual.\n",
                "01-foundations.md": f"# Fundaciones de API — {m.identity.name}\n\nDiseño centrado en contratos tipados, idempotencia y respuestas HTTP/CLI predecibles.\n",
                "02-tokens.md": f"# Diccionario de Formatos — {m.identity.name}\n\nConvención de serialización JSON, timestamps UTC en ISO-8601 y errores RFC 7807.\n",
                "03-layout.md": "# No aplica (sin UI)\n",
                "04-components.md": "# Controladores y Adaptadores (sin UI)\n",
                "05-pages.md": "# Endpoints y Comandos (sin UI)\n",
                "06-code-mapping.md": "# Mapeo de Contratos a Código\n",
                "tokens.json": json.dumps({"version": "1.0.0", "has_ui": False, "note": "Backend / CLI API - No visual tokens required"}, indent=2),
            }

        is_flutter = m.stack.stack_type in (StackType.FLUTTER, StackType.DART)

        docs = [
            "01-foundations.md",
            "02-tokens.md",
            "03-layout.md",
            "04-components.md",
            "05-pages.md",
            "06-code-mapping.md",
            "README.md",
        ]

        result: dict[str, str] = {}
        for doc in docs:
            template_path = self.ds_template_dir / doc
            if template_path.exists():
                raw = template_path.read_text(encoding="utf-8", errors="ignore")
                content = raw.replace("<PROYECTO>", m.identity.name)

                # Si no requiere navegación D-Pad, purgar referencias a TV/cruceta
                if not m.ui.focus_navigation_required:
                    content = content.replace("D-Pad / Mando a distancia (si aplica a TV o consolas)", "Navegación por teclado estándar (Tab, Enter, Escape) y ratón/táctil")
                    content = content.replace("D-Pad", "Teclado y Táctil")
                    content = content.replace("mando a distancia", "teclado y puntero")
                    content = content.replace("sección horizontal  ← foco se mueve en un eje", "grid responsivo de contenido")

                # Especialización de mapeo a código y componentes según stack
                if doc == "06-code-mapping.md" and not is_flutter:
                    content = self._web_code_mapping()
                elif doc == "04-components.md" and not is_flutter:
                    content = self._web_components()
                elif doc == "05-pages.md" and not is_flutter:
                    content = self._web_pages()

                result[doc] = content
            else:
                result[doc] = f"# {doc}\n\nEspecificación de diseño para {m.identity.name}.\n"

        result["tokens.json"] = self._resolve_tokens_json()
        return result

    def _web_code_mapping(self) -> str:
        m = self.manifest
        css_fw = getattr(m.ui, "css_framework", "tailwind")
        return f"""# 06 — Correspondencia con el Código (Web / {css_fw.capitalize()})

Traza cómo cada token visual llega al código fuente web y cómo se verifica.
Esta tabla garantiza que el sistema de diseño no es documentación muerta.

---

## 1. Cadena de trazabilidad

```
tokens.json → variables CSS / clases utilitarias → componente web → spec (MOD-ui) → test
```

| Token | Clase / Variable ({css_fw}) | Elemento Web | Spec | Test de Paridad |
|---|---|---|---|---|
| `colors.background.primary` | `var(--color-bg-primary)` / `bg-background-primary` | `<body>`, `<main>` | `MOD-ui` | `test_theme_tokens_parity` |
| `colors.background.surface` | `var(--color-bg-surface)` / `bg-background-surface` | `<section>`, `.card` | `MOD-ui` | `test_theme_tokens_parity` |
| `colors.text.primary` | `var(--color-text-primary)` / `text-text-primary` | `<h1>`, `<p>`, `<span>` | `MOD-ui` | `test_theme_tokens_parity` |
| `colors.brand.primary` | `var(--color-brand-primary)` / `bg-brand-primary` | `.btn-primary` | `MOD-ui` | `test_theme_tokens_parity` |
| `colors.brand.danger` | `var(--color-brand-danger)` / `text-brand-danger` | `.alert-danger`, `.btn-kill` | `MOD-ui` | `test_theme_tokens_parity` |
| `spacing.md` | `var(--spacing-md)` / `p-4`, `gap-4` | Contenedores y grillas | `MOD-ui` | `test_theme_tokens_parity` |
| `typography.font_family_sans` | `var(--font-sans)` / `font-sans` | Raíz tipográfica | `MOD-ui` | `test_theme_tokens_parity` |

---

## 2. Reglas de Mapeo

1. **Cero HEX literal en HTML/JS/CSS:** Prohibido escribir códigos de color hexadecimales directos en archivos `.html`, `.vue`, `.tsx`, `.py` o plantillas. Deben consumirse siempre a través de las variables CSS de tokens o clases configuradas.
2. **Actualización atómica:** Cualquier adición o modificación en `tokens.json` debe reflejarse en la hoja de estilos raíz (`tokens.css` o `tailwind.config.js`) y en este documento en el mismo commit.
3. **Verificación automatizada:** El check 04_ui_tokens de `preflight` analiza el código buscando expresiones regulares de color literal y falla la build si se detectan transgresiones.
"""

    def _web_components(self) -> str:
        m = self.manifest
        component_rows = []
        if m.ui.key_components:
            for item in m.ui.key_components:
                if ":" in item:
                    cid, cdesc = item.split(":", 1)
                    component_rows.append(f"| `{cid.strip()}` | {cdesc.strip()} | Interfaz interactiva adaptada | `default`, `active` |")
                else:
                    component_rows.append(f"| `{item.strip()}` | Componente clave del sistema | Vista visual | `default` |")
        else:
            component_rows = [
                "| `DS-LAYOUT-CONTAINER` | Contenedor Principal | Envoltura responsiva con ancho máximo y padding seguro | `default` |",
                "| `DS-NAV-HEADER` | Barra de Navegación | Cabecera superior con logotipo, estado y accesos directos | `default`, `sticky` |",
                "| `DS-INPUT-BUTTON` | Botón de Acción | Disparador de acciones primarias, secundarias y destructivas | `default`, `hover`, `focus`, `disabled`, `loading` |",
                "| `DS-INPUT-SWITCH` | Interruptor de Control | Control de alternancia rápida (ej. hardware switches, pausar) | `on`, `off`, `disabled` |",
                "| `DS-DATA-METRIC-CARD` | Tarjeta de Métrica | Visualización de KPI con valor numérico, etiqueta y tendencia | `default`, `alert` |",
                "| `DS-DATA-TABLE` | Tabla de Datos | Lista estructurada de registros con cabecera y ordenación | `default`, `empty`, `loading` |",
                "| `DS-FEEDBACK-ALERT` | Banner de Estado | Notificación contextual con variante semántica (info, warn, error) | `info`, `warning`, `danger` |",
                "| `DS-FEEDBACK-LOADER` | Indicador de Carga | Spinner o esqueleto visual durante peticiones asíncronas | `animating` |",
            ]
        table_rows = "\n".join(component_rows)

        return f"""# 04 — Componentes Visuales del Sistema (`DS-*`)

Inventario canónico de componentes reutilizables de {m.identity.name}.
Cada componente define propósito, anatomía, estados y tokens consumidos.

---

## 1. Convención de Identificadores

```
DS-<ÁMBITO>-<NOMBRE>
```

Ámbitos: `LAYOUT` (estructura), `NAV` (navegación), `INPUT` (acciones y formularios),
`FEEDBACK` (alertas, loaders, estados vacíos), `DATA` (métricas, tablas, feeds).

---

## 2. Inventario de Componentes Canónicos

| ID | Nombre / Propósito | Ámbito | Estados |
|---|---|---|---|
{table_rows}

---

## 3. Reglas de Construcción

1. **Aislamiento Funcional:** Los componentes `DS-*` no contienen lógica de red ni acceso directo a bases de datos; reciben datos y eventos vía propiedades/atributos.
2. **Accesibilidad Obligatoria:** Todo control interactivo (`BUTTON`, `SWITCH`) cuenta con atributos `aria-label`, foco visible con outline nítido y ratio de contraste mínimo 4.5:1 (WCAG AA).
"""

    def _web_pages(self) -> str:
        m = self.manifest
        return f"""# 05 — Estructura de Páginas y Layout Responsivo

Blueprint de distribución espacial y flujo de usuario para {m.identity.name}.

---

## 1. Rejilla y Breakpoints Responsivos

El sistema se adapta fluidamente a los viewports móviles y de escritorio (optimizado para PWA en iOS Safari):

| Dispositivo | Ancho Mínimo | Columnas | Margen Lateral | Safe Areas |
|---|---|---|---|---|
| **Móvil (Smartphones / iPhone)** | `< 640px` | 1 columna fluida | `16px` | `env(safe-area-inset-top)` / `bottom` |
| **Tablet / iPad** | `640px - 1024px` | 2 - 4 columnas | `24px` | Ajuste dinámico |
| **Escritorio (Desktop / Monitor)** | `> 1024px` | 12 columnas (máx. 1200px) | `32px` | Centrado automático |

---

## 2. Blueprint de Vistas de la Aplicación PWA

```
┌────────────────────────────────────────────────────────┐
│ DS-LAYOUT-SHELL (env(safe-area-inset-top))             │
├────────────────────────────────────────────────────────┤
│ VISTA ACTIVA:                                          │
│ 1. MAPA: Google Maps Fullscreen + Marcadores Avatar    │
│    - Botones flotantes (Centrar, FitBounds)            │
│    - DS-LOCATION-CARD: Bottom Sheet táctil de detalle  │
│ 2. CHAT: Canal grupal familiar (últimos 50 msgs)       │
│    - DS-CHAT-MESSAGE: Burbujas reactivas con avatar    │
│    - Caja de texto expandible con soporte de emojis    │
│ 3. AJUSTES: Perfil, diagnóstico GPS y Panel Admin      │
│    - Recorte/compresión canvas (<300x300, <50KB)       │
│    - DS-ADMIN-SWITCH (registration_open)               │
│    - DS-ADMIN-MEMBER-ROW (Aprobar, Rechazar, Purga)    │
├────────────────────────────────────────────────────────┤
│ DS-NAV-DOCK (Dock flotante glassmorphic blur 24px)     │
│ [ 🗺️ Mapa ]        [ 💬 Chat ]        [ ⚙️ Ajustes ]    │
│ env(safe-area-inset-bottom)                            │
└────────────────────────────────────────────────────────┘
```

---

## 3. Principios de Interacción

- **Diseño Táctil sin Fricción:** Objetivos táctiles mínimos de 48x48 px, botones píldora (`rounded-full`) y animaciones elásticas suaves.
- **Respeto a Gestos WebKit:** Desactivar rebote elástico no deseado (`overscroll-behavior-y: none`) y aplicar `touch-action: pan-x pan-y` para no interferir con Google Maps.
- **Feedback Inmediato:** Indicador visual instantáneo en acciones que involucren red Firestore/Storage.
"""

    def _resolve_tokens_json(self) -> str:
        m = self.manifest

        # 1. Si el manifiesto trae tokens personalizados recuperados del PRD/usuario, usarlos directamente
        if m.ui.custom_tokens:
            return json.dumps(m.ui.custom_tokens, indent=2)

        # 2. Si existe un tokens.json en la plantilla, adaptarlo sin inventar valores mágicos
        template_tokens = self.ds_template_dir / "tokens.json"
        if template_tokens.exists():
            try:
                data = json.loads(template_tokens.read_text(encoding="utf-8", errors="ignore"))
                if "meta" in data:
                    data["meta"]["name"] = f"{m.identity.name} Design Tokens"
                return json.dumps(data, indent=2)
            except Exception:
                pass

        # 3. Fallback neutro
        neutral = {
            "version": "1.0.0",
            "theme": m.ui.theme_preference,
            "has_ui": True,
            "colors": {},
            "spacing": {},
            "typography": {}
        }
        return json.dumps(neutral, indent=2)
