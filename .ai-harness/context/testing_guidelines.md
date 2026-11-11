# Guía de pruebas

Qué se prueba, con qué nivel de confianza y qué se considera evidencia
suficiente para cerrar una spec.

---

## 1. Pirámide

| Nivel | Qué cubre | Proporción esperada |
|---|---|---|
| Unitario | Reglas de dominio, mappers, utilidades puras | Mayoría |
| Widget / componente | Presentación, estados, foco y navegación | Media |
| Integración | Flujo completo con dependencias reales o simuladas | Minoría |
| Manual | Comportamiento percibido (accesibilidad, plataforma) | Puntual y registrado |

## 2. Reglas de oro

- Un test verifica un comportamiento observable, no una implementación.
- Prohibido depender de red real, reloj real o aleatoriedad sin control.
- Cada test es determinista y aislado: el orden no puede alterar el resultado.
- Un test que falla de forma intermitente se corrige o se elimina; no se ignora.
- Los datos de prueba viven en `fixtures/`; no se inventan dentro de los tests
  si se van a reutilizar.

## 3. Trazabilidad

- Cada `FR-*` o `ST-*` de una spec cita al menos un `TC-*`.
- Cada `TC-*` existe como test real con ese identificador en su nombre o en su
  descripción.
- Un requisito sin test no está terminado.
- Un test sin requisito es sospechoso: o falta spec, o sobra test.

## 4. Cobertura

- La cobertura no es un objetivo por sí misma: es una señal.
- Las rutas de error críticas tienen prueba obligatoria.
- Las ramas de cancelación y timeout tienen prueba.
- Prohibido "testear el getter" para subir el porcentaje.

## 5. Nombres

```
<unidad>_<escenario>_<resultado esperado>
```

Ejemplo: `parse_catalog_with_missing_field_returns_validation_error`.

## 6. Qué se considera evidencia

Para marcar una spec como implementada:

1. Los tests de sus `TC-*` existen y pasan.
2. `sync-sdd` reporta `PRESENT` para el target.
3. Los escenarios BDD están cubiertos por al menos un test o una verificación
   manual registrada.

## 7. Prohibiciones

- Omitir tests porque "el código es trivial".
- Desactivar un test en lugar de corregir la causa.
- Verificar solo el camino feliz.
- Compartir estado mutable entre tests.
