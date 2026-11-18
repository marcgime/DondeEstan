# Propuesta de Cambio: Tab Bar auto-compacto (4s) y animacion efecto agua (0.5s)

```yaml
change_id: "2026-11-tab-bar-water-compact"
title: "Tab Bar auto-compacto (4s) y animacion efecto agua (0.5s)"
module: "MOD-ui"
status: CONSOLIDATED
consolidated_at: "2026-11-18"
created_at: "2026-11-18"
author: "Antigravity Architect"
tier: standard
```

---

## 1. Motivación y Contexto

El dock de navegación inferior (`DS-NAV-DOCK`) mostraba de forma estática las 3 opciones con texto (`Mapa`, `Chat`, `Perfil`) y un cambio brusco del color de resalte. Para ofrecer una experiencia más expresiva, limpia y menos intrusiva:
1. **Modo auto-compacto tras 4 segundos (`4000ms`) de inactividad:** si el usuario no interactúa con el Tab Bar durante 4 segundos, el dock se encoge suavemente ocultando los textos y dejando únicamente los 3 logotipos (iconos) de los menús en una píldora compacta. Al tocar o interactuar con el dock, se expande de nuevo y reinicia el temporizador de 4 segundos.
2. **Animación de onda efecto agua (`0.5s` / `500ms`) en el botón activo:** al seleccionar cualquiera de las pestañas (por ejemplo `Chat`), el recuadro de resalte primario tarda `0.5s` en quedarse fijo mientras ejecuta una onda rápida efecto agua (oleaje líquido + onda concéntrica) dentro del propio botón.

---

## 2. Delta de Especificación (Cambios sobre el Módulo Maestro)

### Contratos Afectados
- **[+] Añadido:** `CT-UI-06: Dock de Navegación Flotante Auto-Compacto y Efecto Agua (FloatingTabBar)`
  - Archivo: `src/ui/components/FloatingTabBar.ts::renderFloatingTabBar`
  - Opciones: `activeTab: 'map' | 'chat' | 'profile'`, `onNavigateTab: (tab) => void`, `onActiveTabClick?: () => void`, `inactivityMs?: number` (por defecto `4000`), `waterDurationMs?: number` (por defecto `500`).
  - Retorna función `cleanup: () => void` que limpia timers determinísticamente al desmontar la vista.

### Invariantes y Reglas Afectadas
- **[+] Añadido:** `BR-UI-04: Auto-compactación tras 4s y onda de agua de 0.5s en DS-NAV-DOCK`
  - El Tab Bar se compacta a solo iconos tras `4000ms` sin interacción táctil/puntero/teclado, liberando el timer en el `cleanup()` de cada vista.
  - Al seleccionar una pestaña, el botón activo reproduce una animación de onda líquida de `500ms` antes de quedar fijo en el color primario de marca.
  - Respeta `prefers-reduced-motion` y mantiene `aria-label` accesible en los 3 botones incluso cuando las etiquetas visuales están colapsadas.

### Flujos Afectados
- `MapView`, `ChatView` y `ProfileView` delegan el renderizado y ciclo de vida del dock inferior en `renderFloatingTabBar`, eliminando código duplicado y manteniendo coherencia visual y de estado entre cambios de pestaña.

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- **Limpieza determinista:** el temporizador de 4 segundos y el de 0.5 segundos se cancelan siempre al desmontar la vista para evitar fugas de memoria.
- **Accesibilidad:** cada botón conserva `aria-label` (`Mapa`, `Chat`, `Perfil`) y `aria-current="page"` en la pestaña activa, garantizando lectura por lectores de pantalla cuando el texto está oculto en modo compacto.
- **Teclado virtual en Chat:** sigue respetando `.chat-keyboard-open .safe-dock-bottom` para ocultarse cuando el teclado virtual está abierto.
