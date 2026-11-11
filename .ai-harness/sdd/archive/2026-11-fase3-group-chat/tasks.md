# Tareas de Implementación: Fase 3 — Canal Único de Chat Grupal Familiar y Navegación Reactiva

```yaml
change_id: "2026-11-fase3-group-chat"
status: CONSOLIDATED
```

---

## 1. Modelos de Dominio y Contratos
- [x] 1.1 Crear tipos y esquemas de mensaje (`src/chat/types.ts`).
- [x] 1.2 Implementar servicio de chat familiar con `limit(50)` y sanitización (`src/chat/chat_service.ts`).
- [x] 1.3 Crear suite de pruebas unitarias para el servicio de chat (`tests/unit/chat/chat_service.test.ts`).

## 2. Componentes Visuales y Vista de Chat (Kinetic Bloom)
- [x] 2.1 Crear vista de chat familiar (`src/chat/views/ChatView.ts`) con burbujas propias/ajenas, input inferior y autoscroll.
- [x] 2.2 Exportar API pública del módulo en `src/chat/index.ts`.

## 3. Integración de Navegación (Bottom Nav)
- [x] 3.1 Integrar navegación reactiva en `src/main.ts` entre `map` y `chat`.
- [x] 3.2 Conectar eventos de cambio de pestaña en la barra inferior de `MapView` y `ChatView`.
- [x] 3.3 Garantizar desconexión del listener `onSnapshot` de chat al conmutar a mapa.

## 4. Calidad y Verificación
- [x] 4.1 Ejecutar suite de pruebas unitarias (`npm test`).
- [x] 4.2 Compilar proyecto (`npm run build`).
- [x] 4.3 Ejecutar validadores del arnés (`harness-validator`, `preflight`, `sync-sdd`).
