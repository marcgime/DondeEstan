# 05 — Estructura de Páginas y Layout Responsivo

Blueprint de distribución espacial y flujo de usuario para DondeEstan.

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
