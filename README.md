# DondeEstan

**Español** | [English](README.en.md)

> PWA familiar privada para visualización de ubicación en directo, chat grupal instantáneo y administración estricta de accesos a coste cero (Firebase Spark + Google Maps Platform).

Proyecto construido con **TypeScript** (Vite PWA + Tailwind CSS) bajo **Clean Architecture** y desarrollo guiado por especificaciones (**OpenSpec SDD**).

---

## 1. Visión y Módulos del Producto

- **Audiencia objetivo:** Núcleo familiar cerrado (8 miembros con dispositivos iPhone) y administrador
- **Stack tecnológico:** TypeScript | Vite PWA + Tailwind CSS | Gestor: `npm`
- **Plataformas objetivo:** iOS Safari PWA, Mobile Web
- **Política de privacidad:** zero_telemetry


### Módulos Principales (Scopes)
- **Infraestructura Base y Configuración Transversal (`block_core`):** Inicialización del SDK Firebase (Auth, Firestore, Storage), variables de entorno, utilidades comunes y registro del Service Worker PWA.
- **Autenticación, Whitelist y Control de Acceso (`block_auth`):** Flujo de registro y login cerrado contra /whitelist/{email}, asignación de estado pending_approval en Firestore y vista fija gatekeeper de bloqueo.
- **Panel de Administración y Moderación Familiar (`block_admin`):** Interruptor global registration_open, gestión de emails en whitelist, aprobación manual de accesos pendientes y purga total de datos de usuario.
- **Geolocalización Reactiva y Google Maps (`block_location`):** Gestión del ciclo de vida WebKit (visibilitychange), throttling adaptativo (30s/15m o 120s heartbeat), marcadores AdvancedMarkerElement y presencia online/offline.
- **Canal Único de Chat Grupal Familiar (`block_chat`):** Chat grupal reactivo para los 8 miembros, consulta limitada a los últimos 50 mensajes, desconexión activa del listener onSnapshot al cambiar de vista y prevención de doble envío.
- **Perfil, Ajustes y Diagnóstico del Dispositivo (`block_profile`):** Edición de display_name, compresión y recorte de avatar en <canvas> (<300x300, <50KB) hacia Storage, diagnóstico de permisos GPS en Safari y logout.
- **Sistema de Diseño Kinetic Bloom y Shell PWA (`block_ui`):** Componentes visuales Material 3 Expressive, dock flotante glassmorphic (blur 24px), tokens de diseño Kinetic Bloom, temas adaptable y adaptación a safe-areas de iOS.

---

## 2. Requisitos y Comandos de Desarrollo

- Runtime de TypeScript instalado en la máquina.
- Python 3.11+ para la ejecución del tooling de gobernanza (`requirements.txt`).

```bash
# Instalación de dependencias del arnés
python -m pip install -r requirements.txt

# Arranque de la aplicación
python .ai-harness/skills/launch-app/runner.py
# (Comando subyacente: npm run dev)

# Ejecución de la suite de tests
npm test
```

---

## 3. Puertas de Verificación de Calidad (Quality Gates)

Antes de realizar commits o publicar cambios, el sistema valida la arquitectura e integridad:

```bash
python .ai-harness/skills/harness-validator/runner.py
python .ai-harness/skills/preflight/runner.py
python .ai-harness/skills/sync-sdd/runner.py
```

---

## 4. Flujo de Trabajo para Agentes de IA

Cualquier agente de IA que colabore en este repositorio debe comenzar leyendo obligatoriamente [`AGENTS.md`](AGENTS.md) y ejecutar la carga JIT en el orden exacto indicado antes de inspeccionar o modificar código.

---

## 5. Sobre el Autor

**Marc Giménez Liarte** — Software Architect & Lead Engineer
