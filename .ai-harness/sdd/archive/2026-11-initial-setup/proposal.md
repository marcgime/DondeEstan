# Propuesta de Cambio: Inicialización del Sistema

```yaml
change_id: "2026-11-initial-setup"
title: "Configuración e Inicialización Base del Arnés"
module: "MOD-core"
status: CONSOLIDATED
created_at: "2026-11-11"
consolidated_at: "2026-11-11"
author: "bootstrap-harness"
tier: core
```

---

## 1. Motivación y Contexto

Inicialización fundacional del proyecto **DondeEstan** bajo metodología OpenSpec y gobernanza determinista de agentes de IA.

---

## 2. Delta de Especificación

- **[+] Módulo:** `MOD-core` (Infraestructura Base y Configuración Transversal)
- **[+] Módulo:** `MOD-auth` (Autenticación, Whitelist y Control de Acceso)
- **[+] Módulo:** `MOD-admin` (Panel de Administración y Moderación Familiar)
- **[+] Módulo:** `MOD-location` (Geolocalización Reactiva y Google Maps)
- **[+] Módulo:** `MOD-chat` (Canal Único de Chat Grupal Familiar)
- **[+] Módulo:** `MOD-profile` (Perfil, Ajustes y Diagnóstico del Dispositivo)
- **[+] Módulo:** `MOD-ui` (Sistema de Diseño Kinetic Bloom y Shell PWA)
- **[+] Límites de Escritura:** Archivos de scope contractuales en `scopes/block_*.md`.
- **[+] Calidad Determinista:** Puertas de validación automática (`harness-validator`, `preflight`, `sync-sdd`).
