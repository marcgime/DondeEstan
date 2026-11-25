# Módulo: Perfil, Ajustes y Diagnóstico del Dispositivo (MOD-profile)

```yaml
module_id: MOD-profile
name: "Perfil, Ajustes y Diagnóstico del Dispositivo"
target_path: "src/profile/"
scope: "block_profile.md"
owner: "Product Engineering"
version: "1.0.0"
last_updated: "2026-11-11"
```

---

## 1. Propósito y Responsabilidades

Es la autoridad funcional responsable de **Edición de display_name, compresión y recorte de avatar en <canvas> (<300x300, <50KB) hacia Storage, diagnóstico de permisos GPS en Safari y logout.** dentro de `DondeEstan`.

### Lo que hace
- Modela las entidades, estados y contratos que gobiernan Perfil, Ajustes y Diagnóstico del Dispositivo.
- Expone interfaces públicas tipadas para su consumo por otros módulos o agentes.
- Garantiza la idempotencia y la consistencia transaccional de su subsistema.

### Lo que NO hace
- No accede directamente a la persistencia interna de otros módulos.
- No duplica utilidades de red, logging o contratos ya resueltos en `core`.
- No almacena secretos ni credenciales en código fuente.

---

## 2. Contratos y Tipos Públicos (CT-*)

### CT-01: Modelo inmutable de datos y entidades (ProfileEntity)
- **Símbolo / Archivo:** `src/profile/contracts/profile_models.ts::ProfileServiceContract`
- **Invariantes:** Estructuras inmutables con validación estricta de esquema y tipado.

### CT-02: Servicio de orquestación y reglas de negocio (ProfileService)
- **Símbolo / Archivo:** `src/profile/services/profile_service.ts::ProfileService`
- **Invariantes:** Métodos asíncronos con manejo de excepciones tipadas.

---

## 3. Reglas de Negocio e Invariantes (BR-*)

- **BR-PROFILE-01:** Toda entidad de Perfil, Ajustes y Diagnóstico del Dispositivo valida sus invariantes en el constructor.
- **BR-PROFILE-02:** Las operaciones externas que puedan fallar devuelven un Result tipado.
- **BR-PROFILE-03:** La sección "Núcleo" de la vista de perfil muestra en tiempo real los grupos a los que pertenece el usuario (mediante `GroupService`), desuscribiendo el listener al desmontar la vista (FM-002).
- **BR-PROFILE-04:** El selector de "Tamaño de Letra y Zoom" en la vista de perfil se presenta como un menú plegado por defecto (mostrando la escala activa y su porcentaje); al clicar se despliegan las opciones de zoom y, tras seleccionar una opción, se aplica la escala y el menú se minimiza automáticamente.
- **BR-PROFILE-05:** El usuario puede activar o desactivar desde su perfil si desea recibir notificaciones de nuevos mensajes de chat de sus grupos (`chat_notifications_enabled`).

---

## 4. Flujos y Ciclos de Vida

```mermaid
sequenceDiagram
    Caller->>Service: handleRequest(payload)
    Service->>Entity: validateInvariants()
    alt Validación correcta
        Service->>CoreBus: emitEvent(event)
        Service-->>Caller: Ok(Result)
    else Fallo o límite excedido
        Service-->>Caller: Err(DomainError)
    end
```

---

## 5. Mapa de implementación

| Contrato / Flujo | Símbolo de Código | Ruta en Disco | Pruebas Unitarias |
|---|---|---|---|
| CT-01 | `UserProfileUpdate` | `src/profile/types.ts` | `tests/unit/profile/profile_service.test.ts` |
| CT-02 | `compressAndCropAvatar` | `src/profile/image_compressor.ts` | `tests/unit/profile/profile_service.test.ts` |
| CT-03 | `ProfileService` | `src/profile/profile_service.ts` | `tests/unit/profile/profile_service.test.ts` |
| UI-01 | `renderProfileView` | `src/profile/views/ProfileView.ts` | `tests/unit/profile/profile_service.test.ts` |
