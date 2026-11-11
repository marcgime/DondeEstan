# Tareas de Implementación: [Título del Cambio]

> Checklist de ejecución técnica asociado a `proposal.md`.
> El agente debe marcar con `[x]` cada tarea conforme se complete y verifique.

---

## 1. Fase de Especificación y Diseño
- [ ] Validar la propuesta con el usuario / equipo de producto.
- [ ] Confirmar que no hay colisión con otros cambios en curso en `changes/`.

## 2. Fase de Consolidación Documental
- [ ] Ejecutar `/consolidate-change` (o aplicar delta en `modules/[modulo].md`).
- [ ] Commit documental: `docs(specs): consolidar [slug-del-cambio]`.

## 3. Fase de Implementación de Código
- [ ] Actualizar interfaces y contratos en el código fuente.
- [ ] Implementar la lógica de negocio y flujos correspondientes.
- [ ] Actualizar el `Mapa de implementación` en el módulo maestro.

## 4. Fase de Pruebas y Validación Determinista
- [ ] Escribir o actualizar pruebas unitarias para los nuevos contratos.
- [ ] Ejecutar suite de tests del proyecto y verificar 100% verde.
- [ ] Ejecutar `preflight` del arnés.
- [ ] Ejecutar `sync-sdd` y comprobar cero deriva.
