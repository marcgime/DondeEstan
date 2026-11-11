# Documentación de Entrada del Proyecto (`.ai-harness/input/`)

Este directorio está destinado a almacenar **documentación previa y de referencia** del producto o sistema antes de inicializar o reconfigurar el arnés.

---

## 1. ¿Qué tipo de archivos colocar aquí?

- Documentos de Requisitos de Producto (**PRDs**, briefs, vision docs).
- Especificaciones funcionales o historias de usuario en formato `.md` o `.txt`.
- Esquemas de bases de datos, diagramas entidad-relación o contratos JSON/YAML.
- Guías de arquitectura previa o especificaciones técnicas de APIs externas.

---

## 2. Cómo lo aprovecha la skill `bootstrap-harness`

Al ejecutar la skill:
```bash
python .ai-harness/skills/bootstrap-harness/runner.py --interactive
```
o mediante el comando `/bootstrap-harness.md`:

1. La IA escaneará de forma automática todos los archivos depositados en esta carpeta.
2. Extraerá el nombre del proyecto, propuesta de valor, stack tecnológico sugerido, módulos clave y políticas de seguridad.
3. El cuestionario interactivo pre-rellenará las opciones recomendadas citando tus propios documentos, agilizando el arranque del arnés a menos de 2 minutos.

---

## 3. Reglas de Privacidad y Seguridad

- **No colocar secretos ni credenciales reales:** Tokens de API, claves privadas o contraseñas nunca deben dejarse en este directorio.
- Este directorio forma parte del contexto de diseño y está protegido por las reglas de gobernanza del arnés.

