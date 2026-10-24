# Brote · nutrición personalizada

Aplicación web de planificación alimentaria, registro de comidas, lista de la compra, hábitos, actividad física y progreso. Inspirada funcionalmente en el concepto de un «coach nutricional», con identidad visual propia y estética cercana a las apps de Apple.

> Brote es una herramienta de organización. No diagnostica ni sustituye a un dietista-nutricionista o profesional sanitario.

## Arrancar

```bash
npm install
npm run dev          # desarrollo en http://localhost:5173
npm run build        # build de producción en dist/
npm run build:single # un único index.html autocontenido en dist-single/
```

Al abrirla por primera vez puedes **crear tu perfil** (cuestionario de 7 pasos, todo opcional salvo el nombre) o **probar con datos de demostración**. Los datos demo se identifican con un aviso y etiquetas «Demo», y se pueden restaurar o borrar desde Perfil › Privacidad y datos.

## Qué incluye

| Sección | Funcionalidad |
| --- | --- |
| **Hoy** | Saludo, selector de día, anillo de calorías y barras de macros que se recalculan al marcar/registrar, línea temporal de comidas con horarios, hábitos (agua, pasos, actividad, comidas, personalizados), resumen de actividad y peso |
| **Plan** | Semana navegable, selector de días con progreso, resumen nutricional del día, detalle de receta (ingredientes escalados por ración, pasos, alérgenos, equivalencias de ingredientes), «Cambiar plato» con confirmación, catálogo con favoritas y filtros |
| **Registro** | Búsqueda local, favoritos, recientes, cantidades con raciones típicas, edición y borrado (con deshacer), alimentos personalizados con validación, Open Food Facts opcional, registro por foto/texto (modo demo honesto si no hay IA) |
| **Compra** | Generada desde el menú, agrupada por secciones, suma cantidades, marca de comprado, edición de cantidades, productos manuales, modo tienda, copiar lista; los cambios manuales se conservan al modificar el menú |
| **Progreso** | Periodos 7 d / 1 m / 3 m / 6 m, peso, medidas, cumplimiento del plan, consistencia de hábitos, pasos y minutos de actividad; estados vacíos y aviso de que el peso no equivale a grasa |
| **Actividad** | Plan semanal por tipo (casa, gimnasio, general, descanso) según la preferencia del usuario, rutinas demo, registro de sesiones con duración y observaciones, pasos |
| **Asistente** | Chat con sugerencias, estados de carga/error/reintento, modo demostración claramente identificado, consentimiento para compartir contexto, derivación de consultas médicas |
| **Perfil** | Todos los datos del cuestionario editables, objetivos nutricionales opcionales (sin cálculos automáticos agresivos; botón de referencia UE etiquetado), hábitos, privacidad, exportación de datos, estado de integraciones |

## Arquitectura

```
src/
  types/            Modelo de datos (mapea 1:1 con supabase/migrations/0001_schema.sql)
  data/             Base de alimentos (valores de referencia BEDCA/USDA), recetas, rutinas, demo
  services/         Lógica sin UI: nutrición, planificador, sustituciones, compra, hábitos,
                    equivalencias, base de alimentos (local + Open Food Facts), almacenamiento,
                    ai/ (contexto, proveedor demo, proveedor remoto)
  store/            Estado global + persistencia (DataRepository)
  components/       UI reutilizable (botones, hojas modales, avisos, confirmaciones, menús…)
  features/         Piezas por dominio (comidas, registro, hoy, progreso, actividad)
  pages/            Las 7 pantallas + bienvenida
api/assistant.ts    Backend seguro del asistente (Vercel Edge Function)
supabase/           Esquema SQL con Row Level Security, preparado para migrar
```

- **Nutrición trazable**: las recetas no llevan calorías escritas a mano; se calculan desde ingredientes y cantidades. Los platos libres sin datos se marcan y no se suman.
- **Persistencia**: `LocalRepository` (localStorage, con respaldo en memoria si está bloqueado). Para migrar a Supabase basta implementar `DataRepository` (`src/services/storage.ts`).
- **Sustituciones**: filtro duro por alergias, tipo de dieta y alimentos rechazados; orden por parecido de calorías y proteína, tiempo disponible, ingredientes ya presentes en la semana, favoritas y objetivo. El menú solo cambia al confirmar, con opción de deshacer.

## Despliegue y asistente con IA

Publicada en Vercel (proyecto `brote`): https://brote-gules.vercel.app

El backend (`api/assistant.ts`) elige la credencial en el servidor:

1. `ANTHROPIC_API_KEY` (variable de entorno del proyecto), si existe.
2. Si no, **Vercel AI Gateway** con el token OIDC que Vercel añade a cada petición: no hace falta guardar ninguna clave. Requiere tener una tarjeta registrada en Vercel › AI Gateway (desbloquea los créditos gratuitos).

`GET /api/assistant` hace una petición mínima al modelo para comprobar que responde de verdad. Si no responde, la app usa el modo demostración y lo indica. La clave nunca llega al navegador.

## Privacidad

Los datos se guardan solo en el navegador. No hay analítica ni envío a terceros salvo que el usuario active Open Food Facts (se envía solo el término de búsqueda) o comparta su contexto con un asistente IA configurado (nunca peso ni medidas). Exportación en JSON y borrado total desde Perfil. No se afirma el cumplimiento de ninguna normativa o certificación.

## Pendiente / siguientes pasos

- Cuentas y sincronización con Supabase (esquema listo, sin aplicar).
- Precios por producto para usar el presupuesto en las recomendaciones.
- Recetas propias creadas por el usuario (modelo y tabla preparados; falta el editor).
- Fotografías reales de recetas (`imageUrl` en el modelo; ahora se usan portadas ilustradas).
