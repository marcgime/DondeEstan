# Propuesta de Cambio: Contador dinámico de whitelist y alerta preventiva al superar 15 miembros

```yaml
change_id: "2026-11-whitelist-counter-alert15"
title: "Contador dinámico de whitelist y alerta de cuota al exceder 15 miembros"
module: "MOD-admin"
status: CONSOLIDATED
consolidated_at: "2026-11-12"
created_at: "2026-11-12"
author: "Antigravity Pair"
tier: standard
```

---

## 1. Motivación y Contexto

El requerimiento original establecía un límite rígido de 8 miembros ("Máx 8"). El usuario ha solicitado:
- Eliminar el límite rígido de 8 personas.
- Mostrar la contabilización en tiempo real de cuántas personas hay en la whitelist (ej. `X autorizados`).
- No fijar un número máximo visible.
- Emitir una alerta visual cuando el total de miembros en la whitelist exceda de 15 personas (`> 15`), para advertir al administrador sobre el impacto en las cuotas del plan Spark de Firebase.

---

## 2. Delta de Especificación

### Contratos Afectados
- **[~] Modificado:** `src/admin/views/AdminView.ts`
  - Reemplazar badge fijo `Máx 8` por contador dinámico `${whitelistRecords.length} autorizados`.
  - Si `whitelistRecords.length > 15`, renderizar banner de alerta visible: `⚠️ Más de 15 familiares registrados. Recuerda vigilar las cuotas de lectura/escritura en Firebase Spark.`
- **[~] Modificado:** `src/profile/views/ProfileView.ts`
  - Reemplazar etiqueta `Máximo 8 personas` por `Sin límite (alerta >15)`.

### Invariantes y Reglas Afectadas
- **[+] BR-ADMIN-03:** La whitelist no restringe la adición de nuevos miembros a un número fijo, pero alerta de forma no bloqueante cuando `count > 15`.

---

## 3. Casos Límite y Compatibilidad
- No rompe la compatibilidad con ningún dato existente en Firestore.
- Si hay 0 a 15 miembros, la interfaz muestra el conteo exacto de forma limpia y neutral.
- Si supera 15, la alerta se muestra destacada en la sección de administración sin impedir la adición ni la aprobación de usuarios.
