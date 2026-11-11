# DondeEstan

[Español](README.md) | **English**

> PWA familiar privada para visualización de ubicación en directo, chat grupal instantáneo y administración estricta de accesos a coste cero (Firebase Spark + Google Maps Platform).

Project built with **TypeScript** (Vite PWA + Tailwind CSS) under **Clean Architecture** and Specification-Driven Development (**OpenSpec SDD**).

---

## 1. Product Vision & Architecture

- **Target Audience:** Núcleo familiar cerrado (8 miembros con dispositivos iPhone) y administrador
- **Technology Stack:** TypeScript | Vite PWA + Tailwind CSS | Package Manager: `npm`
- **Target Platforms:** iOS Safari PWA, Mobile Web
- **Privacy Policy:** zero_telemetry


### Core Modules (Scopes)
- **Infraestructura Base y Configuración Transversal (`block_core`):** Inicialización del SDK Firebase (Auth, Firestore, Storage), variables de entorno, utilidades comunes y registro del Service Worker PWA.
- **Autenticación, Whitelist y Control de Acceso (`block_auth`):** Flujo de registro y login cerrado contra /whitelist/{email}, asignación de estado pending_approval en Firestore y vista fija gatekeeper de bloqueo.
- **Panel de Administración y Moderación Familiar (`block_admin`):** Interruptor global registration_open, gestión de emails en whitelist, aprobación manual de accesos pendientes y purga total de datos de usuario.
- **Geolocalización Reactiva y Google Maps (`block_location`):** Gestión del ciclo de vida WebKit (visibilitychange), throttling adaptativo (30s/15m o 120s heartbeat), marcadores AdvancedMarkerElement y presencia online/offline.
- **Canal Único de Chat Grupal Familiar (`block_chat`):** Chat grupal reactivo para los 8 miembros, consulta limitada a los últimos 50 mensajes, desconexión activa del listener onSnapshot al cambiar de vista y prevención de doble envío.
- **Perfil, Ajustes y Diagnóstico del Dispositivo (`block_profile`):** Edición de display_name, compresión y recorte de avatar en <canvas> (<300x300, <50KB) hacia Storage, diagnóstico de permisos GPS en Safari y logout.
- **Sistema de Diseño Kinetic Bloom y Shell PWA (`block_ui`):** Componentes visuales Material 3 Expressive, dock flotante glassmorphic (blur 24px), tokens de diseño Kinetic Bloom, temas adaptable y adaptación a safe-areas de iOS.

---

## 2. Requirements & Development Commands

- TypeScript runtime installed on host machine.
- Python 3.11+ for governance tooling execution (`requirements.txt`).

```bash
# Install harness tooling dependencies
python -m pip install -r requirements.txt

# Launch application
python .ai-harness/skills/launch-app/runner.py
# (Underlying command: npm run dev)

# Run test suite
npm test
```

---

## 3. Deterministic Quality Gates

Before committing or pushing changes, verify architecture and contract integrity:

```bash
python .ai-harness/skills/harness-validator/runner.py
python .ai-harness/skills/preflight/runner.py
python .ai-harness/skills/sync-sdd/runner.py
```

---

## 4. AI Agent Workflow

Any autonomous AI agent collaborating on this repository must strictly start by reading [`AGENTS.md`](AGENTS.md) and execute the JIT context loading sequence before touching code.

---

## 5. About the Author

**Marc Giménez Liarte** — Software Architect & Lead Engineer
