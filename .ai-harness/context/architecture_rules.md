# Arquitectura y guardarraíles

Enfoque arquitectónico, dirección de dependencias e invariantes del sistema.

---

## 1. Enfoque

Organización **feature-first** con capas internas por feature:

```
src/features/<feature>/
├── domain/          # Entidades, contratos y casos de uso puros
├── data/            # Repositorios, DTOs y fuentes de datos
├── application/     # Controladores sin interfaz (opcional)
└── presentation/    # Widgets, pantallas y estado de UI (opcional)
```

Reglas de organización:

- `src/core/` contiene arranque, routing, tema y composición de dependencias.
- `src/core/` contiene infraestructura transversal sin lógica de negocio.
- `src/features/` contiene exclusivamente slices funcionales.
- Una feature no importa archivos internos de otra: solo su API pública.
- El dominio no importa el framework de UI, HTTP, almacenamiento ni paquetes de
  presentación.
- La presentación no accede a red, base de datos, sockets ni código nativo.

## 2. Dirección de dependencias

```
app / composition root
        │
        ├──▶ feature A ──▶ core
        ├──▶ feature B ──▶ core
        └──▶ feature C ──▶ core

core no depende de ninguna feature.
Las features no se importan entre sí; solo consumen APIs públicas.
```

Reglas:

- Las dependencias apuntan siempre hacia el dominio y hacia `core`.
- Prohibidas las dependencias circulares entre features.
- Prohibido importar la carpeta `presentation` de otra feature.
- La composición de dependencias ocurre en `src/core/`, no dentro de componentes o endpoints.

## 3. Invariantes

1. **Una spec por comportamiento:** ningún comportamiento relevante existe solo
   en el código.
2. **Frontera de datos:** solo la feature propietaria accede a su persistencia.
3. **Sin lógica en la vista:** los componentes o endpoints pintan y emiten intenciones.
4. **Errores explícitos:** todo fallo relevante tiene un estado o resultado
   tipado; prohibido silenciar excepciones.
5. **Recursos acotados:** toda caché declara límite y política de evicción.
6. **Sin datos personales por defecto:** cualquier recogida se justifica por
   escrito.
7. **Accesibilidad:** toda acción es alcanzable con teclado o D-Pad.
8. **Tokens:** ningún valor visual literal fuera de la capa de tema.
9. **Liberación determinista:** al cerrar un recurso se cancela, se libera y se
   verifica que no quedan procesos ni conexiones.
10. **Sin secretos en el repositorio:** las credenciales viven fuera del árbol
    versionado.

## 4. Fronteras por módulo

| Módulo | Puede | No puede |
|---|---|---|
| `<dominio>` | Resolver reglas, transformar datos, exponer contratos | Pintar, navegar, acceder a la UI |
| `<datos>` | Leer y escribir fuentes, mapear DTOs | Decidir navegación, definir estilos |
| `<presentación>` | Componer vistas, gestionar foco y estado de UI | Acceder a red, base de datos o código nativo |
| `<app>` | Componer dependencias, definir rutas y tema | Implementar reglas de negocio |

## 5. Recursos y rendimiento

- El trabajo pesado no bloquea el hilo de interfaz.
- Las listas se cargan de forma paginada o incremental.
- Las imágenes se cargan bajo demanda con caché acotada.
- Toda caché nueva declara tamaño máximo y criterio de expulsión.
- Los recursos nativos se liberan al salir de la vista que los usa.

## 6. Verificación de arquitectura

Antes de cerrar un cambio:

1. El análisis estático no reporta errores nuevos.
2. La suite de tests está en verde.
3. Ninguna feature importa otra fuera de su API pública.
4. Ningún widget accede a red, almacenamiento ni código nativo.
5. Las invariantes de §3 se revisan explícitamente.
6. Los validadores del arnés pasan.

## 7. Prohibiciones

- Duplicar lógica de negocio en la capa de presentación.
- Crear dependencias circulares.
- Introducir una capa de servicio remoto que la arquitectura no declara.
- Mantener cachés sin límite.
- Escribir valores visuales literales.
- Publicar en Git sin instrucción explícita.
