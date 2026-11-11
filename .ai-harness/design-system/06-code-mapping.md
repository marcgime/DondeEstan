# 06 — Correspondencia con el Código (Web / Tailwind)

Traza cómo cada token visual llega al código fuente web y cómo se verifica.
Esta tabla garantiza que el sistema de diseño no es documentación muerta.

---

## 1. Cadena de trazabilidad

```
tokens.json → variables CSS / clases utilitarias → componente web → spec (MOD-ui) → test
```

| Token | Clase / Variable (tailwind) | Elemento Web | Spec | Test de Paridad |
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
