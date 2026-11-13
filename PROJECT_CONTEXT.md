# Brote · contexto del proyecto

Resumen técnico para retomar el trabajo. El detalle de uso está en `README.md`.

## Qué es

App web (React 18 + TypeScript + Vite + Tailwind) de planificación alimentaria: menú semanal, registro diario, lista de la compra, hábitos, actividad, progreso y asistente. Datos en el navegador (`localStorage`) mediante `DataRepository` (`src/services/storage.ts`); esquema Supabase preparado en `supabase/migrations/` pero no aplicado. Publicada en Vercel desde GitHub (`main` → producción, otras ramas → vista previa).

## Arquitectura

```
Alimentos ─────────────────────────────────────────────────────────────────────┐
  src/data/foods.ts        ~300 alimentos con id legible (los usan las recetas)  │
  foodDb/official.json     ~790 más de BEDCA (AESAN) y USDA (catálogo genérico)  │
  foodDb/branded.json      4.860 productos de 121 marcas (Open Food Facts), diferida│
  AppData.customFoods      alimentos propios y productos de marca ya usados      │
                                                                                 ▼
Biblioteca (src/data/recipeLibrary, 672 recetas) ─┐
Mis platos (AppData.customRecipes, custom: true) ─┼─► Recetas ─► Plan semanal (AppData.plan) ─► Registro diario (AppData.log)
                                                   └──────────────────────────────┴─► Lista de la compra (services/shopping.ts)
```

- `src/types/index.ts`: modelo único (mapea con las tablas SQL).
- `src/services/nutrition.ts`: **cálculo central**. `foodMacros` (valor por 100 g/ml × cantidad / 100) es la única fórmula; `ingredientsNutrition`, `plannedMealNutrition`, `logEntryMacros` y `dayTotals` se apoyan en ella.
- `src/services/dishes.ts`: «Mis platos» (unidades, cálculo total/por ración, guardar, duplicar, borrar, copias para el historial).
- `src/services/planner.ts`: generación de menús con rotación de 4 semanas (solo usa la biblioteca; los platos propios se añaden a mano).
- `src/services/catalog.ts`: `getRecipe`/`allRecipes` devuelven biblioteca + platos propios con el mismo tipo `Recipe`; `getFood`/`allFoods` devuelven alimentos de la app + catálogo oficial + alimentos del usuario.
- `src/services/foodSearch.ts`: índice de búsqueda de alimentos (nombre, marca, categoría, variedad, tolerancia a erratas) y carga diferida de los productos de marca.
- `src/services/history.ts`: migración que congela el historial cuando cambian los valores de la base de alimentos.

## Base de datos de alimentos

- **Fuentes** (por orden de prioridad):
  1. **BEDCA** — Base de Datos Española de Composición de Alimentos, AESAN/BEDCA v1.0 (2010). 922 de sus 969 alimentos, valores por 100 g de porción comestible. Condiciones: uso personal, educativo o no comercial citando la fuente y sin alterar los datos; un uso comercial requiere autorización expresa de AESAN. Brote se declara no comercial. Solo se convierten unidades: kcal = kJ ÷ 4,184 y sal = sodio × 2,5.
  2. **USDA FoodData Central, SR Legacy** (dominio público, CC0): ~180 alimentos seleccionados a mano para completar BEDCA (pechuga de pollo cruda sin piel, legumbres cocidas, bebidas vegetales, carne picada por % de grasa, quesos, salsas, proteína en polvo…), con nombre en español.
  3. **Open Food Facts** (licencia ODbL; datos de etiqueta aportados por la comunidad): productos de marcas habituales en supermercados españoles (Hacendado, Carrefour, Dia, Eroski, Alcampo, Lidl, Danone, Pascual, Central Lechera Asturiana, Nestlé, ElPozo, Campofrío, Président, Arla…). Se presentan como «Etiqueta · Open Food Facts», no como dato oficial. El fichero `src/data/foodDb/branded.json` es una base de datos derivada bajo ODbL (atribución: © colaboradores de Open Food Facts).
- **Reglas**: no se inventa ningún valor. Un alimento necesita energía declarada. Si falta un macronutriente, `incomplete: true` (cuenta como 0 y se avisa). Los campos sin dato (fibra, saturadas, azúcares, sal) quedan vacíos y la interfaz muestra «s/d». Se excluyen las entradas cuya energía no cuadra con sus macronutrientes (control de Atwater con tres variantes de cálculo de la fibra) y las revisadas a mano (`BEDCA_EXCLUDE`, p. ej. «garbanzo hervido» con valores de producto seco). Motivos y recuentos en `src/data/foodDb/report.json`.
- **Campos por alimento** (`Food`): nombre, marca, grupo (subcategoría), sección de la compra, unidad de referencia (g o ml), kcal, proteínas, hidratos, grasas, saturadas, azúcares, fibra, sal, alérgenos, fuente (`source`), referencia (`ref`: «BEDCA 2541», «USDA FDC 171077», código de barras) y estado (`incomplete`, `approxMl` cuando la fuente da valores por 100 g y la app los aplica a 100 ml).
- **Alimentos de la app** (`foods.ts`): cada id legible se enlaza con su dato oficial en `scripts/data/mapping.mjs` (`BASE_MAP`). Los 13 sin equivalente fiable conservan su valor estimado (`source: 'referencia'`): queso batido 0 %, bebida de avena, tortitas de arroz, dorada, soja texturizada, skyr, yogur de soja, copos de maíz, arroz basmati, ñoquis, masa de pizza, pan de hamburguesa y pan rallado. Los registros de BEDCA o USDA ya enlazados no se repiten en el catálogo.
- **Regenerar**: `scripts/data/fetch-bedca.mjs` (BEDCA), descarga de SR Legacy desde fdc.nal.usda.gov, `scripts/data/fetch-off.mjs` (Open Food Facts, ≤ 10 consultas/min) y `node scripts/data/build-foods.mjs <bedca> <usda> <off.json>`. Los scripts de red necesitan `NODE_USE_ENV_PROXY=1` detrás del proxy.
- **Carga y rendimiento**: alimentos de la app y catálogo oficial en el paquete principal, unos 40 KB comprimidos. Productos de marca en un fragmento aparte, unos 152 KB comprimidos, que se descarga al abrir el buscador. Al elegir un producto de marca se copia en `customFoods`, así platos y registros lo encuentran siempre, aunque no se haya cargado el fragmento.
- **Buscador**: índice en memoria (~5.900 alimentos, unos 30 ms por búsqueda). Busca en nombre, marca y grupo; admite sinónimos y faltas de una o dos letras. Ordena así: alimentos de la app, catálogo oficial y, por último, marcas; las marcas solo suben al buscar su nombre. Cada resultado muestra la etiqueta «Genérico» o la marca, las kcal por 100 g o ml y el grupo. Tiene filtro «Todo · Genéricos · Marcas». Open Food Facts en línea sigue siendo opcional (Perfil).
- **Calidad del dato de una receta** (`nutritionQuality`): «Datos de fuentes oficiales» si todos los ingredientes son de BEDCA, USDA o etiqueta; «parcialmente estimado» si alguno es estimado o tuyo; «pendiente» si falta alguno. La ficha muestra el recuento por fuente.
- **Historial al corregir alimentos**: las recetas y los platos usan siempre los valores vigentes. Lo ya consumido no cambia: cada registro de alimento guarda `per100` al anotarse y cada plato guarda `snapshot`. La migración `migrateFoodDb` (`foodDbVersion` 1 → 2) congeló, con los valores anteriores (`LEGACY_PER100`), los registros y las comidas ya hechas o pasadas creados antes del cambio a BEDCA/USDA. Si vuelve a cambiar la base, sube `FOOD_DB_VERSION` y conserva la tabla de valores anteriores.

## Mis platos (platos creados por el usuario)

- **Modelo**: `Recipe` con `custom: true` en `AppData.customRecipes` (separado de la biblioteca, que es código). `dish.items` guarda lo que escribió el usuario para el **plato completo** (`foodId`, `quantity`, `unit`); `ingredients` es la cantidad **por ración** en g/ml, derivada al guardar, para que ficha, plan, compra y nutrición funcionen sin código paralelo. También: `title` (nombre libre), `description`, `imageUrl` (foto comprimida a JPEG ≤ 640 px como data URL), `servings`, `minutes`, `steps`, `dish.category`, `dish.ownerId`, `dish.createdAt`, `dish.updatedAt`.
- **Unidades**: g, kg, ml, l, unidades, cucharadas y cucharaditas. Solo se ofrecen las que tienen conversión fiable para ese alimento: g/kg en sólidos, ml/l en líquidos (nunca ml↔g sin densidad), «unidad» si la base define el peso de una pieza (p. ej. huevo M = 55 g), cucharadas 15 ml / cucharaditas 5 ml en líquidos y, en sólidos, solo si la base define el peso de una cucharada de ese alimento.
- **Cálculo**: `dishNutrition(items, servings)` → total, por ración, fibra y lista de ingredientes que no se han podido sumar (resultado marcado como incompleto). Cambiar las raciones no toca las cantidades.
- **Historial**: cada registro de plato en Hoy guarda `snapshot` (valores de una ración en ese momento) y `amount` = raciones consumidas. Al editar un plato se congelan con `snapshot` sus usos pasados o ya hechos en el plan (`freezeDishUses`); al borrarlo, todos. Editar o borrar nunca cambia lo ya comido.
- **Integración**: Recetas (sección y filtro «Mis platos», «Crear mi plato», ficha con Editar/Duplicar/Eliminar, «Registrar hoy», «Añadir al menú»), Hoy (pestaña «Mis platos» en «Añadir alimento», raciones ½/1/1½/2 o libres, crear plato sin salir), Plan («Cambiar plato › Mis platos» y acceso a crear), lista de la compra (ingredientes sumados con los de la biblioteca y marcados «incluye Mis platos»; los productos manuales siguen aparte).
- **Buscador de recetas**: los platos propios aparecen en los resultados junto a la biblioteca (primero, con la etiqueta «Mi plato»). Al buscar, la fila «Crear «…» como mi plato» abre el mismo `DishEditor` con el nombre buscado ya escrito (prop `initialName`); no hay un segundo formulario. El botón «Crear mi plato» de la cabecera y el acceso desde Plan (`#/recetas?nuevo=1`) abren el mismo componente.
- **Campos de cantidad**: el valor se guarda como texto (`qtyText`) mientras se escribe y se convierte a número solo para calcular. No se selecciona el contenido al tocar el campo, así que el cursor queda donde se pulsa.
- **Alimentos**: el buscador común (`useFoodSearch`) con todo el catálogo (app + BEDCA/USDA + marcas), Open Food Facts en línea opcional y alimentos propios con sus valores por 100 g/ml (`CustomFoodForm`).

## Hojas modales y foco (corrección)

`components/ui/Sheet.tsx` guarda `onClose` en una referencia y su efecto de foco depende solo de `open`. Antes dependía también de `onClose`: las páginas pasan funciones nuevas en cada render, así que cada pulsación volvía a ejecutar el efecto, que movía el foco al panel. El campo perdía el foco y el teclado del iPhone se cerraba tras cada número. Afectaba a todas las hojas con campos de texto. Para evitar que vuelva a pasar, cualquier efecto de una hoja que mueva el foco debe depender solo de `open`.

## Biblioteca de recetas

672 recetas: 130 desayunos, 180 comidas, 133 cenas, 79 meriendas, 66 de media mañana, 46 snacks y 38 postres. Las 145 de `recipeLibrary/v4/` usan los alimentos incorporados: quesos (manchego, cheddar, gouda, brie, roquefort, cabrales, provolone, ricotta, tetilla…), cordero, conejo, costillas, embutidos, lenguado, besugo, rodaballo, salmonete, berberechos, zamburiñas, vieiras, legumbres secas, bebidas vegetales y proteína en polvo. Cada ingrediente es un `foodId` de la base: la nutrición se calcula, nunca se escribe a mano. 609 recetas se calculan al 100 % con datos de BEDCA/USDA y el resto incluye algún alimento estimado. Las recetas oficiales no usan productos de marca (cargan en diferido); los platos del usuario sí. El planificador penaliza repetir recetas de las 4 semanas anteriores (−30 − 10 × reciente) y avisa cuando una franja tiene menos de 35 recetas compatibles.

## Pruebas

- `npm run check:library`: integridad de la biblioteca y simulación del planificador.
- `npm run check:dishes`: 18 comprobaciones de Mis platos (un ingrediente, cinco, cambio de cantidad, borrar ingrediente, raciones, unidades, guardar, persistencia JSON, menú semanal y compra, registrar 1 y ½ ración, suma del día, borrar consumo, editar, historial intacto, duplicar, borrar plato, datos incompletos).
- `npm run check:foods`: cantidad y variedad por grupo, ids únicos, fuente declarada, genérico/marca, buscador («leche», «queso», «mozarela», «yogurt griego», «hacendado leche», «quesos»), velocidad, plato con alimentos nuevos y recetas que los usan.
- `npm run typecheck` y `npm run build`.

## Pendiente

- Cuentas y sincronización con Supabase (migraciones 0001–0003 preparadas).
- Fotos reales para la biblioteca (ahora portadas ilustradas, marcadas como tales).
- Si Brote pasa a ser comercial: solicitar autorización a AESAN para BEDCA (o sustituirla por USDA).
- Equivalentes oficiales para los 13 alimentos que conservan un valor estimado.
- Más recetas sin gluten para perfiles vegetarianos/veganos.
