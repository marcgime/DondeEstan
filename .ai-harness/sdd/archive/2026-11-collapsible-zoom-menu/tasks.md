# Tareas de Implementación: Selector de zoom plegable en Mi Perfil

> Checklist de ejecución técnica asociado a `proposal.md`.
> El agente debe marcar con `[x]` cada tarea conforme se complete y verifique.

---

## 1. Fase de Especificación y Diseño
- [x] Validar la propuesta con el usuario / equipo de producto.
- [x] Confirmar que no hay colisión con otros cambios en curso en `changes/`.

## 2. Fase de Consolidación Documental
- [x] Ejecutar `/consolidate-change` (o aplicar delta en `modules/[modulo].md`).
- [x] Commit documental: `docs(specs): consolidar 2026-11-collapsible-zoom-menu`.

## 3. Fase de Implementación de Código
- [x] Actualizar interfaces y contratos en el código fuente.
- [x] Implementar la lógica de negocio y flujos correspondientes.
- [x] Actualizar el `Mapa de implementación` en el módulo maestro.

## 4. Fase de Pruebas y Validación Determinista
- [x] Escribir o actualizar pruebas unitarias para los nuevos contratos.
- [x] Ejecutar suite de tests del proyecto y verificar 100% verde.
- [x] Ejecutar `preflight` del arnés.
- [x] Ejecutar `sync-sdd` y comprobar cero deriva.
