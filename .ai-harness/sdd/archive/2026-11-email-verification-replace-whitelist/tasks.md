# Checklist de Implementación: Sustitución de Whitelist por Verificación de Email y Aprobación Admin

```yaml
change_id: "2026-11-email-verification-replace-whitelist"
total_tasks: 4
completed_tasks: 4
```

- [x] **T1: Refactorización de `FamilyAuthService` y tipos**
  - Añadir estado `'unverified_email'` a `UserStatus` en `src/auth/types.ts`.
  - En `register()`: eliminar validación contra whitelist y enviar `sendEmailVerification(user)`.
  - Crear `checkEmailVerifiedAndPromote()` y `resendVerificationEmail()`.
- [x] **T2: Actualización de `GatekeeperScreen` y `main.ts`**
  - Manejar estado `'unverified_email'` con interfaz amigable para confirmar correo y botón "Ya he verificado mi correo".
  - Transición automática a `'pending_approval'` al verificar email.
- [x] **T3: Limpieza de Whitelist en `AuthView` y `AdminView`**
  - Quitar menciones de whitelist en `AuthView`.
  - Adecuar `AdminView` para gestionar solicitudes entrantes verificadas.
- [x] **T4: Tests Unitarios y Despliegue CI/CD**
  - Actualizar tests de auth y gatekeeper.
  - Pasar checks `harness-validator`, `preflight`, `sync-sdd` y publicar a Cloudflare.
