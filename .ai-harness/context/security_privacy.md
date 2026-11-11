# Seguridad y privacidad

Reglas para no filtrar datos, no introducir superficie de ataque y no romper
promesas de privacidad del producto.

---

## 1. Principios

1. **Minimización:** solo se recoge el dato imprescindible, y se justifica.
2. **Local por defecto:** si el dato puede quedarse en el dispositivo, no sale.
3. **Sin telemetría de usuario:** prohibidas las analíticas, el crash reporting
   remoto y cualquier identificador persistente.
4. **Superficie mínima:** cada puerto, permiso y dependencia se declara y se
   justifica.
5. **Fallar cerrado:** ante duda, se deniega la operación.

## 2. Secretos

- Prohibido versionar claves, tokens, certificados o keystores.
- `.env` y equivalentes están excluidos en `.gitignore` y `.aiignore`.
- Los secretos se inyectan en tiempo de ejecución, nunca se compilan.
- Si un secreto se filtra: se rota y se documenta en un ADR.

## 3. Datos personales

- Cualquier dato personal requiere justificación escrita en la spec.
- Prohibido registrar datos personales en logs, incluso en desarrollo.
- Los datos locales se cifran si el producto lo exige o el riesgo lo justifica.
- Se define retención y borrado explícitos.

## 4. Entrada no confiable

- Toda entrada externa se valida antes de usarse.
- Prohibido construir rutas de fichero con datos externos sin confinamiento.
- Los tamaños y cantidades se limitan explícitamente.
- Prohibido deserializar formatos arbitrarios sin esquema.

## 5. Red y red

- Solo se abre lo declarado en `platform_matrix.md`.
- Los servicios locales escuchan en loopback salvo declaración expresa.
- Toda conexión saliente se documenta con su propósito.
- Prohibido desactivar la verificación de certificados.

## 6. Dependencias y licencias

- Toda dependencia nueva implica revisar licencia y tamaño.
- Prohibidas las licencias incompatibles con la distribución prevista.
- Las dependencias sin mantenimiento se marcan y se sustituyen con un ADR.

## 7. Verificación

| Comprobación | Herramienta |
|---|---|
| Paquetes de analítica o proxy prohibidos | `preflight` → `DEP-FORBIDDEN` |
| Tokens de telemetría en el código | `preflight` → `PRIVACY-REMOTE-TELEMETRY` |
| Secretos versionados | Revisión de `.gitignore` y `.aiignore` |
| Endpoint expuesto fuera de loopback | Perfil `streaming` de `preflight` |

## 8. Prohibiciones

- Introducir telemetría, publicidad o perfilado.
- Registrar datos personales o contenido del usuario.
- Publicar en Git sin instrucción explícita.
- Añadir permisos o puertos sin declararlos.
