# Propuesta de Cambio: Fase 1 — Infraestructura PWA, UI Tokens Kinetic Bloom y Autenticación Cerrada

```yaml
change_id: "2026-11-fase1-pwa-auth-setup"
title: "Fase 1: Infraestructura PWA, UI Tokens Kinetic Bloom y Autenticación Cerrada"
module: "MOD-auth"
status: CONSOLIDATED
consolidated_at: "2026-11-11"
created_at: "2026-11-11"
author: "Antigravity"
tier: core
```

---

## 1. Motivación y Contexto

Para dar inicio al desarrollo de **DondeEstan** según el [PRD.docx](../../input/PRD.docx) (§8 Roadmap) y el diseño visual extraído de Stitch (**Kinetic Bloom**), se requiere establecer los cimientos del cliente web PWA y el mecanismo de acceso restringido a coste cero:

1. **Cero fugas de acceso:** El núcleo familiar está acotado estrictamente a 8 personas. Ningún usuario desconocido debe poder registrarse y ningún familiar recién registrado puede ver coordenadas o mensajes hasta ser validado por el administrador.
2. **Cero costes fijos:** Configuración del SDK cliente Firebase Spark (Auth y Firestore) con reglas estrictas de seguridad.
3. **Fidelidad visual Kinetic Bloom:** Configurar el andamiaje Vite + Tailwind CSS integrando al 100% los tokens de diseño (colores violeta `#6b38fb`, melocotón `#f38c7a`, menta `#31553d`, Plus Jakarta Sans y curvaturas orgánicas píldora).

---

## 2. Delta de Especificación (Cambios sobre Módulos)

### Módulo Principal Afectado: `MOD-auth` (src/auth/)

#### Contratos Afectados:
- **[+] `CT-AUTH-01: WhitelistValidator`**
  - **Símbolo:** `src/auth/whitelist.ts::verifyEmailEligibility`
  - **Firma:** `verifyEmailEligibility(email: string): Promise<WhitelistResult>`
  - **Comportamiento:** Comprueba `/config/system.registration_open` y consulta `/whitelist/{email}`. Solo retorna `ELIGIBLE` si `status === 'preapproved'`.
- **[+] `CT-AUTH-02: FamilyAuthService`**
  - **Símbolo:** `src/auth/auth_service.ts::FamilyAuthService`
  - **Métodos:**
    - `register(email, password, displayName): Promise<AuthSession>`
    - `login(email, password): Promise<AuthSession>`
    - `logout(): Promise<void>`
  - **Invariante:** Al crear cuenta, crea `/users/{uid}` con `status: "pending_approval"`, `role: "member"` y actualiza la whitelist con el `uid`.
- **[+] `CT-AUTH-03: GatekeeperGuard`**
  - **Símbolo:** `src/auth/gatekeeper.ts::checkAccessGate`
  - **Comportamiento:** Si `user.status === 'pending_approval'`, bloquea la navegación e intercepta la UI mostrando la pantalla de espera `DS-GATE-LOCKED`.

#### Reglas de Negocio (BR-*):
- **`BR-AUTH-01` (Registro Cerrado):** Si `registration_open === false`, la UI deniega todo intento de alta con mensaje: «El registro familiar está temporalmente cerrado».
- **`BR-AUTH-02` (Preautorización Obligatoria):** Solo emails existentes en `/whitelist/{email}` con `status == 'preapproved'` pueden invocar `createUserWithEmailAndPassword`.
- **`BR-AUTH-03` (Gatekeeper Preventivo):** Ningún componente de mapa ni chat se suscribe a Firestore si el usuario no tiene `status === 'active'`.

---

### Módulos Secundarios Afectados:

- **`MOD-core` (`src/core/`):**
  - **[+] `CT-CORE-01: FirebaseClient` (`src/core/firebase.ts`):** Inicialización modular de Firebase Auth y Firestore mediante variables de entorno `VITE_FIREBASE_*`.
  - **[+] `CT-CORE-02: PwaManifest` (`public/manifest.json`):** Web App Manifest PWA con `display: standalone`, `name: "Localizador Familiar"`, `short_name: "Familia"`.

- **`MOD-ui` (`src/ui/`):**
  - **[+] `CT-UI-01: KineticBloomTokens` (`src/ui/theme/tokens.css`):** Mapeo de `tokens.json` a variables CSS semánticas consumidas por Tailwind.
  - **[+] `CT-UI-02: DS-GATE-LOCKED` (`src/ui/components/GatekeeperScreen.ts`):** Pantalla fija de espera para familiares en estado `pending_approval` con botón de cierre de sesión y acción de contacto al administrador.

---

## 3. Modelo de Datos Involucrado (Firestore)

```
databases/(default)/documents/
  ├── config/system
  │     ├── registration_open: boolean
  │     └── max_family_members: number (8)
  ├── whitelist/{email}
  │     ├── status: "preapproved" | "pending_approval" | "active"
  │     ├── uid: string | null
  │     └── added_at: timestamp
  └── users/{uid}
        ├── email: string
        ├── display_name: string
        ├── role: "admin" | "member"
        ├── status: "pending_approval" | "active" | "rejected"
        └── created_at: timestamp
```

---

## 4. Reglas de Seguridad Asociadas (firestore.rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isAdmin() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    function isActiveMember() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'active';
    }

    match /config/system {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /whitelist/{email} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /users/{userId} {
      allow read: if isActiveMember() || isAdmin();
      allow create: if isAuthenticated() &&
        request.auth.uid == userId &&
        request.resource.data.status == 'pending_approval' &&
        get(/databases/$(database)/documents/config/system).data.registration_open == true;
      allow update: if (isActiveMember() && request.auth.uid == userId) || isAdmin();
      allow delete: if isAdmin();
    }
  }
}
```

---

## 5. Casos Límite y Mitigaciones

1. **Email con mayúsculas/minúsculas:** Los correos en la whitelist se normalizan siempre con `.toLowerCase().trim()`.
2. **Rechazo por el administrador:** Si el admin rechaza la solicitud, el documento se purga o pasa a `rejected`; la interfaz vuelve inmediatamente a la pantalla de login con aviso explícito.
3. **Dispositivos iOS:** La pantalla gatekeeper incluye `safe-area-inset` para no colisionar con el Dynamic Island de iPhone.
