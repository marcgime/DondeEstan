# Propuesta de Cambio: Fase 4 — Panel de Administración Familiar y Perfil con Compresión de Avatar

```yaml
change_id: "2026-11-fase4-admin-profile"
title: "Fase 4: Panel de Administración Familiar y Perfil con Compresión de Avatar"
module: "MOD-admin"
status: CONSOLIDATED
consolidated_at: "2026-11-11"
created_at: "2026-11-11"
author: "Antigravity"
tier: core
```

---

## 1. Motivación y Contexto

Culminar la gobernanza de accesos cerrados y personalización de identidad familiar según el [PRD.docx](../../input/PRD.docx) (§4 Módulos 3 y 4 y §8 Roadmap):

1. **Gestión Administrativa Autoservicio (Rol Admin):**
   - El administrador debe poder aprobar o rechazar familiares pendientes de validación (`pending_approval`) con un solo toque desde la propia aplicación.
   - Control de la lista blanca familiar: alta y baja de correos preautorizados (`/whitelist/{email}`).
   - Conmutador global de registro (`/config/system.registration_open`).
   - Purga total de datos de familiares dados de baja.
2. **Cero Costes en Imágenes (Coste Cero Spark):**
   - Compresión y recorte cuadrado en cliente mediante `HTMLCanvasElement` antes de persistir, generando avatares optimizados (≤ 30 KB) sin depender de Cloud Functions ni cuotas de Storage pesado.
3. **Fidelidad Visual Kinetic Bloom:**
   - Vista de perfil con selector de fotos, modal táctil de administración familiar con tarjetas y badges de estado.

---

## 2. Delta de Especificación (Cambios sobre Módulos)

### Módulo Principal Afectado: `MOD-admin` (`src/admin/`)

#### Contratos Afectados:
- **[+] `CT-ADM-01: AdminService` (`src/admin/admin_service.ts`):**
  - Métodos:
    - `approveMember(uid: string): Promise<void>`
    - `rejectMember(uid: string): Promise<void>`
    - `addWhitelistEmail(email: string): Promise<void>`
    - `removeWhitelistEmail(email: string): Promise<void>`
    - `setRegistrationOpen(isOpen: boolean): Promise<void>`
    - `purgeMember(uid: string): Promise<void>`
- **[+] `CT-ADM-02: AdminView` (`src/admin/views/AdminView.ts`):**
  - Panel visual de administración reactivo para aprobación de cuentas y lista blanca.

### Módulo Secundario Afectado: `MOD-profile` (`src/profile/`)

#### Contratos Afectados:
- **[+] `CT-PRF-01: ImageCompressor` (`src/profile/image_compressor.ts`):**
  - `compressAndCropAvatar(file: File): Promise<string>`
  - Invariante: Redimensión a 256x256 px, compresión JPEG a 0.82 y salida en Base64DataUrl.
- **[+] `CT-PRF-02: ProfileService` (`src/profile/profile_service.ts`):**
  - `updateDisplayName(uid: string, name: string): Promise<void>`
  - `updateAvatar(uid: string, avatarDataUrl: string): Promise<void>`
- **[+] `CT-PRF-03: ProfileView` (`src/profile/views/ProfileView.ts`):**
  - Pantalla completa de perfil con selector de foto, edición de nombre y botón de acceso al panel admin.

---

## 3. Reglas de Negocio e Invariantes (BR-*)

- **BR-ADM-01:** Solo usuarios con `role === 'admin'` pueden invocar métodos de `AdminService` o abrir `AdminView`.
- **BR-ADM-02:** El administrador no puede purgarse a sí mismo (protección de auto-bloqueo).
- **BR-PRF-01:** Las imágenes de avatar deben comprimirse en el cliente a un peso inferior a 50 KB antes de persistir.
