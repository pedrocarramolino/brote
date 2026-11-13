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
| **Plan** | Semana navegable, propuesta semanal con **Aceptar menú**, **Otra propuesta** (solo cambia lo no aceptado) y **Cambiar día**, avisos cuando el catálogo no permite cumplir todas las reglas, detalle de receta (ingredientes escalados, pasos, alérgenos, fibra, equivalencias, cantidad de cada ingrediente editable solo en esa comida sin tocar la receta original, «Añadir alimento» con sus valores energéticos), postre de fruta de temporada en algunas comidas y cenas, «Cambiar plato» con Sorpréndeme y deshacer |
| **Comida libre** | Cualquier comida de la semana puede marcarse como «comida libre» desde «Cambiar plato» o el menú de la comida: no suma calorías previstas, no entra en la compra, se respeta al pedir otra propuesta y se puede deshacer para volver al plato del plan |
| **Mis platos** | «Crear mi plato»: nombre libre, ingredientes con cantidad y unidad (g, kg, ml, l, unidades, cucharadas cuando hay conversión fiable), raciones, foto, descripción y pasos opcionales; calorías, macros y fibra del plato completo y por ración en tiempo real; editar, duplicar y eliminar; registrar en Hoy por raciones (½, 1…) y añadir al menú; el historial guarda una copia de los valores |
| **Alimentos** | Unos 1.080 alimentos genéricos, sin marcas comerciales, con un valor de referencia por 100 g/ml de BEDCA (AESAN) y USDA FoodData Central. Se conservan las variedades distintas (leche entera, semidesnatada, desnatada y sin lactosa, bebidas vegetales…). Hamburguesas de todos los tipos (ternera por % de grasa, pollo, pavo, cerdo, cordero, venado, bisonte, vegetal; wagyu y mixta como estimación indicada). Buscador por nombre, categoría y variedad, que tolera erratas; muestra saturadas, azúcares, fibra y sal cuando hay dato |
| **Recetas** | Biblioteca de 690 recetas (incluidas 26 hamburguesas: ternera, wagyu, pollo, pavo, cerdo, cordero, venado, bisonte, pescado, vegetales y veganas) con nombre comercial y descripción, buscador por nombre/ingrediente, filtros (categoría, cocina, tiempo, calorías, proteína, ingrediente principal, dificultad, dieta), favoritas, recientes, colecciones y «Sorpréndeme» con «Añadir al menú» |
| **Registro** | Búsqueda local, favoritos, recientes, cantidades editables en unidades o gramos/ml (−/+ o escribiendo, con decimales: 2 kiwis → 1, medio plátano, 150 → 100 g), edición y borrado (con deshacer), alimentos personalizados con validación, registro por foto/texto (modo demo honesto si no hay IA) |
| **Compra** | Generada desde el menú, agrupada por secciones, suma cantidades, marca de comprado, edición de cantidades, productos manuales, modo tienda, copiar lista; los cambios manuales se conservan al modificar el menú |
| **Progreso** | Periodos 7 d / 1 m / 3 m / 6 m, peso, medidas, cumplimiento del plan, consistencia de hábitos, pasos y minutos de actividad; estados vacíos y aviso de que el peso no equivale a grasa |
| **Actividad** | Plan semanal por tipo (casa, gimnasio, general, descanso) según la preferencia del usuario, rutinas demo, registro de sesiones con duración y observaciones, pasos |
| **Asistente** | Chat con sugerencias, estados de carga/error/reintento, modo demostración claramente identificado, consentimiento para compartir contexto, derivación de consultas médicas |
| **Perfil** | Todos los datos del cuestionario editables, objetivos nutricionales opcionales (sin cálculos automáticos agresivos; botón de referencia UE etiquetado), hábitos, privacidad, exportación de datos, estado de integraciones |

## Arquitectura

```
src/
  types/            Modelo de datos (mapea 1:1 con supabase/migrations/0001_schema.sql)
  data/             Base de alimentos (valores de referencia, con fibra), biblioteca de recetas, rutinas, demo
    recipeLibrary/  Catálogo independiente de la interfaz: build.ts (filas → Recipe), titles.ts
                    (nombres comerciales de v1/v2), v3/ (recetas nuevas por categoría)
  services/         Lógica sin UI: nutrición, planificador (rotación 4 semanas), biblioteca
                    (colecciones e historial), sustituciones, compra, hábitos,
                    equivalencias, base de alimentos genéricos, almacenamiento,
                    ai/ (contexto, proveedor demo, proveedor remoto)
  store/            Estado global + persistencia (DataRepository)
  components/       UI reutilizable (botones, hojas modales, avisos, confirmaciones, menús…)
  features/         Piezas por dominio (comidas, registro, hoy, progreso, actividad)
  pages/            Las 7 pantallas + bienvenida
api/assistant.ts    Backend seguro del asistente (Vercel Edge Function)
supabase/           Esquema SQL con Row Level Security, preparado para migrar (0002: biblioteca)
scripts/check-library.ts  Validación de la biblioteca y simulación del planificador
scripts/check-dishes.ts   Pruebas de Mis platos (cálculo, plan, registro e historial)
PROJECT_CONTEXT.md        Resumen técnico del proyecto
```

- **Nutrición trazable**: las recetas no llevan calorías escritas a mano; se calculan desde ingredientes y cantidades. Los platos libres sin datos se marcan y no se suman.
- **Persistencia**: `LocalRepository` (localStorage, con respaldo en memoria si está bloqueado). Para migrar a Supabase basta implementar `DataRepository` (`src/services/storage.ts`).
- **Sustituciones**: filtro duro por alergias, tipo de dieta y alimentos rechazados; orden por parecido de calorías y proteína, tiempo disponible, ingredientes ya presentes en la semana, favoritas y objetivo. El menú solo cambia al confirmar, con opción de deshacer.

## Fuentes de datos nutricionales

- **BEDCA**: AESAN/BEDCA, Base de Datos Española de Composición de Alimentos v1.0 (2010). Se usa para fines no comerciales y citando la fuente, como exigen sus condiciones; un uso comercial requeriría autorización de AESAN.
- **USDA FoodData Central, SR Legacy**: dominio público.
- **Open Food Facts** (ODbL, © colaboradores de Open Food Facts): solo la mediana de etiquetas de productos equivalentes para tres variedades sin dato oficial (leche entera, semidesnatada y desnatada sin lactosa). Brote no incluye marcas comerciales.

Cómo se generan y qué se excluye: `PROJECT_CONTEXT.md` y `src/data/foodDb/report.json`.

## Biblioteca gastronómica

Arquitectura: **biblioteca → recetas → planificación semanal → registro diario**. Las recetas viven en `src/data/recipeLibrary` como datos (no dentro de componentes) y se identifican por un `id` estable que usan menús, favoritos, historial y lista de la compra. Para añadir recetas basta con añadir filas a `v3/*.ts`; la interfaz no cambia.

- **690 recetas**: 130 desayunos, 196 comidas, 135 cenas, 79 meriendas, 66 de media mañana, 46 snacks y 38 postres. Cocina española, mediterránea, italiana, mexicana, asiática, americana y del mundo; pollo, pavo, ternera, cerdo, pescado blanco y azul, atún, marisco, huevo, lácteos, legumbres y proteína vegetal.
- **Cada receta**: id, nombre comercial (`title`, p. ej. «Pollo Power Bowl»), nombre descriptivo (`name`), categoría, franjas, cocina, ingrediente principal, raciones, tiempo, dificultad, ingredientes con cantidad y unidad **por ración**, pasos, etiquetas. Alérgenos, compatibilidad con dietas, calorías, macros y fibra se **calculan** desde los ingredientes (no se escriben a mano) y se muestran como **valores estimados**; cuentan como verificados los calculados al 100 % con BEDCA, USDA o media de etiquetas.
- **Fotografías**: no hay fotos reales verificadas de cada plato. Se usa una portada ilustrada propia (icono del tipo de plato + colores de sus ingredientes), marcada como «Ilustración · sin foto real» en el detalle. El modelo admite `imageUrl` para añadir fotos reales más adelante.
- `npm run check:library` valida ids, nombres comerciales únicos, alimentos existentes, pasos, rangos de calorías por categoría y coherencia kcal/macros, y simula 8 semanas de menús con varios perfiles (repeticiones en la semana, rotación de 4 semanas, proteína en comidas consecutivas, sustituciones y lista de la compra).

### Planificador

Para cada hueco puntúa las recetas compatibles (alergias, dieta, «no me gusta» y tiempo de cocina son filtros duros) y elige la mejor: sin repetir receta en la semana, evitando las de las 4 semanas anteriores (recupera las de hace 5–10 semanas), sin repetir ingrediente principal en comidas principales consecutivas, alternando carne, pescado (~3), legumbre (~2) y huevo, limitando carne roja, variando desayunos y meriendas, repartiendo ingredientes y evitando días con la misma combinación. Ajusta la ración a la energía objetivo. Si el catálogo compatible es pequeño, prioriza las restricciones y lo indica en el Plan.

Datos del usuario: favoritas (`favorites.recipes`), historial derivado del plan (`services/library.ts`), platos aceptados (`PlannedMeal.accepted`) y sustituciones (`AppData.replacements`). Todo se guarda con el resto de datos y sobrevive a recargas.

## Despliegue y asistente con IA

Publicada en Vercel (proyecto `brote`): https://brote-gules.vercel.app

El proyecto está conectado al repositorio de GitHub: cada push a `main` publica en producción y cada push a otra rama genera una vista previa. Configuración de compilación: `npm install` · `npm run build` · salida `dist`.

El backend (`api/assistant.ts`) elige la credencial en el servidor:

1. `ANTHROPIC_API_KEY` (variable de entorno del proyecto), si existe.
2. Si no, **Vercel AI Gateway** con el token OIDC que Vercel añade a cada petición: no hace falta guardar ninguna clave. Requiere tener una tarjeta registrada en Vercel › AI Gateway (desbloquea los créditos gratuitos).

`GET /api/assistant` hace una petición mínima al modelo para comprobar que responde de verdad. Si no responde, la app usa el modo demostración y lo indica. La clave nunca llega al navegador.

## Privacidad

Los datos se guardan solo en el navegador. No hay analítica ni envío a terceros salvo que el usuario comparta su contexto con un asistente IA configurado (nunca peso ni medidas). El buscador de alimentos funciona sin conexión. Exportación en JSON y borrado total desde Perfil. No se afirma el cumplimiento de ninguna normativa o certificación.

## Pendiente / siguientes pasos

- Cuentas y sincronización con Supabase (esquema listo, sin aplicar).
- Precios por producto para usar el presupuesto en las recomendaciones.
- Recetas propias creadas por el usuario (modelo y tabla preparados; falta el editor).
- Fotografías reales de recetas (`imageUrl` en el modelo; ahora se usan portadas ilustradas identificadas como tales).
- Más recetas sin gluten para perfiles vegetarianos/veganos: con esa combinación hay ~15 comidas y cenas compatibles y el menú se repite antes de 4 semanas (la app lo avisa).
