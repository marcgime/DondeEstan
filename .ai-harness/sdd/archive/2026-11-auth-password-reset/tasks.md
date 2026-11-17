# Checklist de Implementación: Recuperación de Contraseña

```yaml
change_id: "2026-11-auth-password-reset"
total_tasks: 3
completed_tasks: 3
```

- [x] **T1: Método `sendPasswordReset` en `FamilyAuthService`**
  - Implementar `sendPasswordReset(rawEmail: string)` usando `sendPasswordResetEmail` de `firebase/auth`.
  - Crear test unitario en `tests/unit/auth/`.
- [x] **T2: Integración en `AuthView.ts`**
  - Añadir enlace "¿Olvidaste tu contraseña?" debajo del campo de contraseña.
  - Implementar vista / estado de recuperación con feedback visual de confirmación de envío.
- [x] **T3: Validación del Arnés y Despliegue CI/CD**
  - Ejecutar `vitest`, `harness-validator`, `preflight`, `sync-sdd` y publicar a Cloudflare Workers.
