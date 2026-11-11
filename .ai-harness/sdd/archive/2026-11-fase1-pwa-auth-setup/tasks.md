# Tareas de Implementación: Fase 1 — Infraestructura PWA, UI Tokens Kinetic Bloom y Autenticación Cerrada

> Checklist de ejecución técnica atómica asociado a `proposal.md`.
> Cada paso se verifica antes de marcar con `[x]`.

---

## Bloque 1: Infraestructura y Entorno PWA (MOD-core)
- [x] 1.1 Inicializar `package.json` con Vite, TypeScript, Tailwind CSS y Firebase SDK v10+.
- [x] 1.2 Configurar `tsconfig.json` con tipado estricto (`strict: true`, `noImplicitAny: true`).
- [x] 1.3 Configurar `vite.config.ts` y Web App Manifest PWA (`public/manifest.json` e iconos iOS).
- [x] 1.4 Implementar `src/core/firebase.ts` para inicialización de Auth y Firestore vía variables de entorno.
- [x] 1.5 Crear archivo `.env.example` con la plantilla de variables `VITE_FIREBASE_*`.

## Bloque 2: Sistema de Diseño y Tokens Kinetic Bloom (MOD-ui)
- [x] 2.1 Configurar `src/ui/theme/tokens.css` mapeando fielmente todos los tokens de `tokens.json`.
- [x] 2.2 Configurar `tailwind.config.js` extendiendo temas, radios píldora, colores Kinetic Bloom y Plus Jakarta Sans.
- [x] 2.3 Implementar shell principal PWA con soporte para `env(safe-area-inset-*)` y prevención de elastic bounce.
- [x] 2.4 Implementar componente de pantalla fija `DS-GATE-LOCKED` (`src/ui/components/GatekeeperScreen.ts`).

## Bloque 3: Lógica de Autenticación, Whitelist y Gatekeeper (MOD-auth)
- [x] 3.1 Implementar `src/auth/types.ts` con tipos inmutables (`WhitelistEntry`, `UserProfile`, `UserRole`, `UserStatus`).
- [x] 3.2 Implementar `src/auth/whitelist.ts` con la función `verifyEmailEligibility(email)`.
- [x] 3.3 Implementar `src/auth/auth_service.ts` con flujos de registro, login y transición a `pending_approval`.
- [x] 3.4 Implementar `src/auth/gatekeeper.ts` con el detector reactivo del estado de membresía.
- [x] 3.5 Crear vistas de Login y Registro con validación en vivo contra Whitelist (`src/auth/views/AuthView.ts`).

## Bloque 4: Reglas de Seguridad y Pruebas Unitarias
- [x] 4.1 Crear archivo `firestore.rules` con las reglas de producción para `/config`, `/whitelist` y `/users`.
- [x] 4.2 Escribir pruebas unitarias para validación de elegibilidad en whitelist y normalización de email.
- [x] 4.3 Escribir pruebas unitarias para el guardián Gatekeeper (bloqueo ante `pending_approval` y `rejected`).
- [x] 4.4 Ejecutar suite de pruebas con `npm test` y verificar 100% verde.

## Bloque 5: Quality Gates y Verificación Final
- [x] 5.1 Ejecutar `python .ai-harness/skills/harness-validator/runner.py`.
- [x] 5.2 Ejecutar `python .ai-harness/skills/preflight/runner.py`.
- [x] 5.3 Ejecutar `python .ai-harness/skills/sync-sdd/runner.py`.
