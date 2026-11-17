# Propuesta de Cambio: Añadir flujo autónomo de recuperación de contraseña

```yaml
change_id: "2026-11-auth-password-reset"
title: "Añadir flujo autónomo de recuperación y restablecimiento de contraseña vía Firebase Auth"
module: "MOD-auth"
status: CONSOLIDATED
consolidated_at: "2026-11-17"
created_at: "2026-11-17"
author: "Antigravity"
tier: standard
```

---

## 1. Motivación y Contexto

Actualmente los usuarios familiares que olvidan su contraseña no tienen forma de recuperarla desde la aplicación. 
Se integra el flujo nativo de Firebase Authentication (`sendPasswordResetEmail`), permitiendo a los usuarios solicitar un enlace seguro a su correo electrónico autorizado para restablecer su contraseña de forma autónoma.

---

## 2. Delta de Especificación (Cambios sobre MOD-auth)

### Contratos y Métodos
- **[+] Añadido en `FamilyAuthService`:**
  - `sendPasswordReset(rawEmail: string): Promise<void>`: Normaliza el correo electrónico y despacha `sendPasswordResetEmail` de Firebase Auth.
- **[+] Añadido en `AuthView`:**
  - Modo `isResetMode: boolean` en la pantalla de autenticación.
  - Enlace "¿Olvidaste tu contraseña?" en el formulario de login.
  - Formulario de recuperación con confirmación de éxito y retorno rápido al login.

---

## 3. Casos Límite y Compatibilidad Hacia Atrás

- Si el correo introducido no es válido o no está registrado, se gestiona el error devolviendo un mensaje comprensible en español sin filtrar información sensible (OWASP recommendations).
- No altera el modelo de base de datos ni afecta a las cuentas existentes.
