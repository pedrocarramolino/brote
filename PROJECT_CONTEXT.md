# Brote · contexto del proyecto

Resumen técnico para retomar el trabajo. El detalle de uso está en `README.md`.

## Qué es

App web (React 18 + TypeScript + Vite + Tailwind) de planificación alimentaria: menú semanal, registro diario, lista de la compra, hábitos, actividad, progreso y asistente. Datos en el navegador (`localStorage`) mediante `DataRepository` (`src/services/storage.ts`); esquema Supabase preparado en `supabase/migrations/` pero no aplicado. Publicada en Vercel desde GitHub (`main` → producción, otras ramas → vista previa).

## Arquitectura

```
Alimentos ─────────────────────────────────────────────────────────────────────┐
  src/data/foods.ts        ~300 alimentos con id legible (los usan las recetas)  │
  foodDb/official.json     ~780 más de BEDCA (AESAN) y USDA (catálogo genérico)  │
  AppData.customFoods      alimentos creados por el usuario (sin marcas)         │
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
- `src/services/foodSearch.ts`: índice de búsqueda de alimentos genéricos (nombre, categoría, variedad, sinónimos, tolerancia a erratas).
- `src/features/meals/QuantityEditor.tsx`: editor de cantidades común (−/+, texto con decimales, unidades ⇄ gramos/ml).
- `src/services/history.ts`: migraciones de la base de alimentos (congelar el historial, quitar marcas).

## Base de datos de alimentos

- **Fuentes** (por orden de prioridad):
  1. **BEDCA** — Base de Datos Española de Composición de Alimentos, AESAN/BEDCA v1.0 (2010). 922 de sus 969 alimentos, valores por 100 g de porción comestible. Condiciones: uso personal, educativo o no comercial citando la fuente y sin alterar los datos; un uso comercial requiere autorización expresa de AESAN. Brote se declara no comercial. Solo se convierten unidades: kcal = kJ ÷ 4,184 y sal = sodio × 2,5.
  2. **USDA FoodData Central, SR Legacy** (dominio público, CC0): ~180 alimentos seleccionados a mano para completar BEDCA (pechuga de pollo cruda sin piel, legumbres cocidas, bebidas vegetales, carne picada por % de grasa, quesos, salsas, proteína en polvo…), con nombre en español.
  3. **Media de etiquetas** (Open Food Facts, ODbL): solo para variedades que no tienen equivalente en BEDCA ni en USDA y que antes solo existían como productos de marca. Hoy son tres: leche entera, semidesnatada y desnatada sin lactosa, con la mediana de 2, 5 y 5 etiquetas (`GROUPED_LABELS` en `foods.ts`, `source: 'openfoodfacts'`, se muestra como «Media de etiquetas»).
- **Sin marcas comerciales**: Brote solo tiene alimentos genéricos, un valor de referencia por alimento y por 100 g/ml. Se quitaron el catálogo de 4.860 productos de marca (`branded.json`), su descarga (`fetch-off.mjs`), la búsqueda en línea de Open Food Facts y su interruptor en Perfil, el filtro «Genéricos · Marcas» y las etiquetas de marca del buscador. Las entradas duplicadas entre BEDCA y USDA se agrupan con `GENERIC_ALIAS` (p. ej. «Leche desnatada» de USDA → `leche_desnatada`); `getFood` resuelve los ids antiguos al genérico, así nada guardado se rompe. `GENERIC_RENAME` quita nombres comerciales del catálogo («Atún en aceite de oliva isabel», «Yogur líquido tipo actimel» → «Leche fermentada líquida (yogur bebible)»). Se conservan las variedades con valores distintos (entera/semidesnatada/desnatada/sin lactosa, bebidas vegetales, crudo/cocido, con/sin piel…). `Food.brand` solo existe en datos antiguos hasta migrarlos.
- **Reglas**: no se inventa ningún valor. Un alimento necesita energía declarada. Si falta un macronutriente, `incomplete: true` (cuenta como 0 y se avisa). Los campos sin dato (fibra, saturadas, azúcares, sal) quedan vacíos y la interfaz muestra «s/d». Se excluyen las entradas cuya energía no cuadra con sus macronutrientes (control de Atwater con tres variantes de cálculo de la fibra) y las revisadas a mano (`BEDCA_EXCLUDE`, p. ej. «garbanzo hervido» con valores de producto seco). Motivos y recuentos en `src/data/foodDb/report.json`.
- **Campos por alimento** (`Food`): nombre, grupo (subcategoría), sección de la compra, unidad de referencia (g o ml), kcal, proteínas, hidratos, grasas, saturadas, azúcares, fibra, sal, alérgenos, fuente (`source`), referencia (`ref`: «BEDCA 2541», «USDA FDC 171077») y estado (`incomplete`, `approxMl` cuando la fuente da valores por 100 g y la app los aplica a 100 ml).
- **Alimentos de la app** (`foods.ts`): cada id legible se enlaza con su dato oficial en `scripts/data/mapping.mjs` (`BASE_MAP`). Los 13 sin equivalente fiable conservan su valor estimado (`source: 'referencia'`): queso batido 0 %, bebida de avena, tortitas de arroz, dorada, soja texturizada, skyr, yogur de soja, copos de maíz, arroz basmati, ñoquis, masa de pizza, pan de hamburguesa y pan rallado. Los registros de BEDCA o USDA ya enlazados no se repiten en el catálogo.
- **Regenerar**: `scripts/data/fetch-bedca.mjs` (BEDCA), descarga de SR Legacy desde fdc.nal.usda.gov y `node scripts/data/build-foods.mjs <bedca> <usda>`. Los scripts de red necesitan `NODE_USE_ENV_PROXY=1` detrás del proxy.
- **Carga y rendimiento**: alimentos de la app y catálogo genérico en el paquete principal, unos 40 KB comprimidos. Sin peticiones de red al buscar.
- **Buscador**: índice en memoria (~1.080 alimentos genéricos, unos 15 ms por búsqueda). Busca en nombre y grupo; admite sinónimos y faltas de una o dos letras. Ordena: alimentos de la app, alimentos del usuario y catálogo BEDCA/USDA. Cada resultado muestra las kcal por 100 g o ml y el grupo.
- **Calidad del dato de una receta** (`nutritionQuality`): «Datos de fuentes oficiales» si todos los ingredientes son de BEDCA, USDA o media de etiquetas; «parcialmente estimado» si alguno es estimado o tuyo; «pendiente» si falta alguno. La ficha muestra el recuento por fuente.
- **Historial al corregir alimentos**: las recetas y los platos usan siempre los valores vigentes. Lo ya consumido no cambia: cada registro de alimento guarda `per100` al anotarse y cada plato guarda `snapshot`. La migración `migrateFoodDb` (`foodDbVersion` 1 → 2) congeló, con los valores anteriores (`LEGACY_PER100`), los registros y las comidas ya hechas o pasadas creados antes del cambio a BEDCA/USDA. Si vuelve a cambiar la base, sube `FOOD_DB_VERSION` y conserva la tabla de valores anteriores.
- **Migración v2 → v3 (quitar marcas)**: `removeBrands` primero congela lo ya comido (`per100` en registros, `snapshot` en comidas hechas o pasadas) y después sustituye cada producto de marca guardado en `customFoods` por su genérico en platos (`ingredients` y `dish.items`), registros, favoritos, ajustes de ingredientes del plan (`swaps`) y lista de la compra. El genérico se elige con `genericFor`: primer resultado del buscador para el nombre del producto, con la misma unidad y valores parecidos (energía ±20 % o 15 kcal, proteína ±25 % o 2 g). Si no hay uno fiable, el producto se queda como alimento propio (`source: 'usuario'`) sin marca y con sus valores. También pasa los ids de `GENERIC_ALIAS` a su genérico y borra `profile.useOpenFoodFacts`.

## Mis platos (platos creados por el usuario)

- **Modelo**: `Recipe` con `custom: true` en `AppData.customRecipes` (separado de la biblioteca, que es código). `dish.items` guarda lo que escribió el usuario para el **plato completo** (`foodId`, `quantity`, `unit`); `ingredients` es la cantidad **por ración** en g/ml, derivada al guardar, para que ficha, plan, compra y nutrición funcionen sin código paralelo. También: `title` (nombre libre), `description`, `imageUrl` (foto comprimida a JPEG ≤ 640 px como data URL), `servings`, `minutes`, `steps`, `dish.category`, `dish.ownerId`, `dish.createdAt`, `dish.updatedAt`.
- **Unidades**: g, kg, ml, l, unidades, cucharadas y cucharaditas. Solo se ofrecen las que tienen conversión fiable para ese alimento: g/kg en sólidos, ml/l en líquidos (nunca ml↔g sin densidad), «unidad» si la base define el peso de una pieza (p. ej. huevo M = 55 g), cucharadas 15 ml / cucharaditas 5 ml en líquidos y, en sólidos, solo si la base define el peso de una cucharada de ese alimento.
- **Cálculo**: `dishNutrition(items, servings)` → total, por ración, fibra y lista de ingredientes que no se han podido sumar (resultado marcado como incompleto). Cambiar las raciones no toca las cantidades.
- **Historial**: cada registro de plato en Hoy guarda `snapshot` (valores de una ración en ese momento) y `amount` = raciones consumidas. Al editar un plato se congelan con `snapshot` sus usos pasados o ya hechos en el plan (`freezeDishUses`); al borrarlo, todos. Editar o borrar nunca cambia lo ya comido.
- **Integración**: Recetas (sección y filtro «Mis platos», «Crear mi plato», ficha con Editar/Duplicar/Eliminar, «Registrar hoy», «Añadir al menú»), Hoy (pestaña «Mis platos» en «Añadir alimento», raciones ½/1/1½/2 o libres, crear plato sin salir), Plan («Cambiar plato › Mis platos» y acceso a crear), lista de la compra (ingredientes sumados con los de la biblioteca y marcados «incluye Mis platos»; los productos manuales siguen aparte).
- **Buscador de recetas**: los platos propios aparecen en los resultados junto a la biblioteca (primero, con la etiqueta «Mi plato»). Al buscar, la fila «Crear «…» como mi plato» abre el mismo `DishEditor` con el nombre buscado ya escrito (prop `initialName`); no hay un segundo formulario. El botón «Crear mi plato» de la cabecera y el acceso desde Plan (`#/recetas?nuevo=1`) abren el mismo componente.
- **Campos de cantidad**: el valor se guarda como texto (`qtyText`) mientras se escribe y se convierte a número solo para calcular. No se selecciona el contenido al tocar el campo, así que el cursor queda donde se pulsa.
- **Alimentos**: el buscador común (`useFoodSearch`) con el catálogo genérico (app + BEDCA/USDA) y alimentos propios con sus valores por 100 g/ml (`CustomFoodForm`).
- **Cantidades**: botones −/+ junto a cada campo (mismos pasos que el editor común, `nextQty`). Al cambiar de unidad se convierte la cantidad (2 kiwis → 150 g) en vez de conservar el número.

## Edición de cantidades

Cualquier alimento consumido se edita sin borrarlo y volver a añadirlo, en unidades o en gramos/ml.

- **Componente**: `QuantityEditor` (`src/features/meals/QuantityEditor.tsx`): `[−] [cantidad] [+]`, selector «unidades · g» (o «ml», «cdas.») si el alimento lo admite y una línea con «75 kcal por unidad · 150 kcal en total (150 g)». Admite decimales con coma. Pasos de `nextQty`: unidades y cucharadas de una en una y medias por debajo de 1 (2 → 1 → ½); g/ml de 5 en 5 hasta 30 y luego de 10 en 10. Los botones no roban el foco (`preventDefault` en `pointerdown`), así que el teclado sigue abierto.
- **Equivalencias**: solo las de la base (`unitSize`, a partir de la ración «1 unidad», «1 mediano»…: kiwi 75 g, huevo M 55 g, plátano 120 g; cucharada 15 ml y cucharadita 5 ml en líquidos, o la cucharada que defina el alimento). Si no hay peso por unidad fiable solo se ofrecen gramos o ml. Nunca ml ⇄ g sin densidad. `qtyToBase` devuelve null para vacío, 0, texto o más de 3 kg/l.
- **Texto mientras se escribe**: el valor es texto (`QtyValue = { text, unit }`) y solo se convierte para calcular; el componente no se vuelve a montar al recalcular.
- **Registro diario** (Hoy › Añadir alimento / tocar un registro): `FoodLogEntry.amount` sigue en g/ml y, si se escribió en unidades, se guardan también `quantity` y `unit` para mostrar «2 unidades · 150 g» y reabrir el editor en unidades. Los alimentos con peso por unidad empiezan en «1 unidad».
- **Comidas del plan** (desayuno, comida, cena, media mañana, merienda; desde Plan o Hoy): en la ficha de la comida, cada ingrediente tiene «Cantidad en esta comida». El cambio se guarda en `PlannedMeal.swaps[foodIdOriginal] = { foodId, amount }` (por ración; el mismo mecanismo de las sustituciones) con `setIngredientAmount`, al momento y sin aviso. La receta de la biblioteca o el plato propio **no cambian**: la fila muestra «Cambiada» y «Receta original: 40 g · Restablecer». `mealIngredients` marca estos ajustes con `original` (cantidad de la receta) y no como sustitución. Si la comida tenía valores congelados (`snapshot`), solo se le aplica la diferencia del ingrediente cambiado.
- **Mis platos** (`DishEditor`): campo de texto + unidad, ahora con −/+ y conversión al cambiar de unidad. Las raciones de un plato registrado se siguen editando en el registro.
- **Recálculo**: todo sale de `foodMacros`, así que kcal, proteínas, hidratos, grasas y fibra de la comida, del día y del plan se actualizan solos.

## Hojas modales y foco (corrección)

`components/ui/Sheet.tsx` guarda `onClose` en una referencia y su efecto de foco depende solo de `open`. Antes dependía también de `onClose`: las páginas pasan funciones nuevas en cada render, así que cada pulsación volvía a ejecutar el efecto, que movía el foco al panel. El campo perdía el foco y el teclado del iPhone se cerraba tras cada número. Afectaba a todas las hojas con campos de texto. Para evitar que vuelva a pasar, cualquier efecto de una hoja que mueva el foco debe depender solo de `open`.

## Comida libre

`PlannedMeal.free = true` marca una comida del plan como libre: el usuario se salta el plato y come lo que quiera. Se activa y se deshace desde «Cambiar plato» (Plan y Hoy) y desde el menú «⋯» de la comida en Hoy. Se conserva `recipeId` para volver al plato. Efectos:

- No suma calorías previstas: `plannedMealNutrition` devuelve null.
- No entra en la lista de la compra.
- No cuenta para la rotación ni el historial de recetas.
- Se conserva con «Otra propuesta», «Cambiar día», «Aceptar menú», `regenerateFrom` y la revisión semanal.
- Puede marcarse como hecha. Lo que se coma se registra, si se quiere, con «Añadir alimento».
- Plan muestra cuántas comidas libres tiene la semana.

## Biblioteca de recetas

672 recetas: 130 desayunos, 180 comidas, 133 cenas, 79 meriendas, 66 de media mañana, 46 snacks y 38 postres. Las 145 de `recipeLibrary/v4/` usan los alimentos incorporados: quesos (manchego, cheddar, gouda, brie, roquefort, cabrales, provolone, ricotta, tetilla…), cordero, conejo, costillas, embutidos, lenguado, besugo, rodaballo, salmonete, berberechos, zamburiñas, vieiras, legumbres secas, bebidas vegetales y proteína en polvo. Cada ingrediente es un `foodId` de la base: la nutrición se calcula, nunca se escribe a mano. 609 recetas se calculan al 100 % con datos de BEDCA/USDA y el resto incluye algún alimento estimado. Ninguna receta usa productos de marca. El planificador penaliza repetir recetas de las 4 semanas anteriores (−30 − 10 × reciente) y avisa cuando una franja tiene menos de 35 recetas compatibles.

## Pruebas

- `npm run check:library`: integridad de la biblioteca, simulación del planificador, sustituciones, lista de la compra y comida libre.
- `npm run check:dishes`: 18 comprobaciones de Mis platos (un ingrediente, cinco, cambio de cantidad, borrar ingrediente, raciones, unidades, guardar, persistencia JSON, menú semanal y compra, registrar 1 y ½ ración, suma del día, borrar consumo, editar, historial intacto, duplicar, borrar plato, datos incompletos).
- `npm run check:foods`: cantidad y variedad por grupo, ids y nombres únicos, equivalentes agrupados, ningún alimento con marca, variedades conservadas, todas las recetas encuentran sus alimentos, buscador («leche», «queso», «mozarela», «yogurt griego», buscar una marca no da marcas), migración de marcas a genérico (platos, registros, favoritos, lo comido no cambia, sin equivalente se conserva), cantidades (kiwi 1/2/½, huevos, medio plátano, g y ml, sin equivalencias inventadas, cambio unidad ⇄ gramos, valores no válidos), comida del plan con cantidad cambiada (recalcula, total del día, receta original intacta) y registro 2 → 1 kiwi.
- `npm run typecheck` y `npm run build`.

## Pendiente

- Cuentas y sincronización con Supabase (migraciones 0001–0005 preparadas).
- Fotos reales para la biblioteca (ahora portadas ilustradas, marcadas como tales).
- Si Brote pasa a ser comercial: solicitar autorización a AESAN para BEDCA (o sustituirla por USDA).
- Equivalentes oficiales para los 13 alimentos que conservan un valor estimado.
- Más recetas sin gluten para perfiles vegetarianos/veganos.
