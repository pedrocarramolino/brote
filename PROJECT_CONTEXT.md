# Brote · contexto del proyecto

Resumen técnico para retomar el trabajo. El detalle de uso está en `README.md`.

## Qué es

App web (React 18 + TypeScript + Vite + Tailwind) de planificación alimentaria: menú semanal, registro diario, lista de la compra, hábitos, actividad, progreso y asistente. Datos en el navegador (`localStorage`) mediante `DataRepository` (`src/services/storage.ts`); esquema Supabase preparado en `supabase/migrations/` pero no aplicado. Publicada en Vercel desde GitHub (`main` → producción, otras ramas → vista previa).

## Arquitectura

```
Biblioteca (src/data/recipeLibrary, 527 recetas)  ─┐
Mis platos (AppData.customRecipes, custom: true)  ─┼─► Recetas ─► Plan semanal (AppData.plan) ─► Registro diario (AppData.log)
Base de alimentos (src/data/foods.ts + customFoods)┘                       │
                                                                            └─► Lista de la compra (services/shopping.ts)
```

- `src/types/index.ts`: modelo único (mapea con las tablas SQL).
- `src/services/nutrition.ts`: **cálculo central**. `foodMacros` (valor por 100 g/ml × cantidad / 100) es la única fórmula; `ingredientsNutrition`, `plannedMealNutrition`, `logEntryMacros` y `dayTotals` se apoyan en ella.
- `src/services/dishes.ts`: «Mis platos» (unidades, cálculo total/por ración, guardar, duplicar, borrar, copias para el historial).
- `src/services/planner.ts`: generación de menús con rotación de 4 semanas (solo usa la biblioteca; los platos propios se añaden a mano).
- `src/services/catalog.ts`: `getRecipe`/`allRecipes` devuelven biblioteca + platos propios con el mismo tipo `Recipe`.

## Mis platos (platos creados por el usuario)

- **Modelo**: `Recipe` con `custom: true` en `AppData.customRecipes` (separado de la biblioteca, que es código). `dish.items` guarda lo que escribió el usuario para el **plato completo** (`foodId`, `quantity`, `unit`); `ingredients` es la cantidad **por ración** en g/ml, derivada al guardar, para que ficha, plan, compra y nutrición funcionen sin código paralelo. También: `title` (nombre libre), `description`, `imageUrl` (foto comprimida a JPEG ≤ 640 px como data URL), `servings`, `minutes`, `steps`, `dish.category`, `dish.ownerId`, `dish.createdAt`, `dish.updatedAt`.
- **Unidades**: g, kg, ml, l, unidades, cucharadas y cucharaditas. Solo se ofrecen las que tienen conversión fiable para ese alimento: g/kg en sólidos, ml/l en líquidos (nunca ml↔g sin densidad), «unidad» si la base define el peso de una pieza (p. ej. huevo M = 55 g), cucharadas 15 ml / cucharaditas 5 ml en líquidos y, en sólidos, solo si la base define el peso de una cucharada de ese alimento.
- **Cálculo**: `dishNutrition(items, servings)` → total, por ración, fibra y lista de ingredientes que no se han podido sumar (resultado marcado como incompleto). Cambiar las raciones no toca las cantidades.
- **Historial**: cada registro de plato en Hoy guarda `snapshot` (valores de una ración en ese momento) y `amount` = raciones consumidas. Al editar un plato se congelan con `snapshot` sus usos pasados o ya hechos en el plan (`freezeDishUses`); al borrarlo, todos. Editar o borrar nunca cambia lo ya comido.
- **Integración**: Recetas (sección y filtro «Mis platos», «Crear mi plato», ficha con Editar/Duplicar/Eliminar, «Registrar hoy», «Añadir al menú»), Hoy (pestaña «Mis platos» en «Añadir alimento», raciones ½/1/1½/2 o libres, crear plato sin salir), Plan («Cambiar plato › Mis platos» y acceso a crear), lista de la compra (ingredientes sumados con los de la biblioteca y marcados «incluye Mis platos»; los productos manuales siguen aparte).
- **Buscador de recetas**: los platos propios aparecen en los resultados junto a la biblioteca (primero, con la etiqueta «Mi plato»). Al buscar, la fila «Crear «…» como mi plato» abre el mismo `DishEditor` con el nombre buscado ya escrito (prop `initialName`); no hay un segundo formulario. El botón «Crear mi plato» de la cabecera y el acceso desde Plan (`#/recetas?nuevo=1`) abren el mismo componente.
- **Campos de cantidad**: el valor se guarda como texto (`qtyText`) mientras se escribe y se convierte a número solo para calcular. No se selecciona el contenido al tocar el campo, así que el cursor queda donde se pulsa.
- **Alimentos**: búsqueda en la base local (valores medios aproximados por 100 g/ml; no contrastados uno a uno con BEDCA), Open Food Facts opcional (datos del fabricante) y alimentos propios con sus valores por 100 g/ml (`CustomFoodForm`).

## Hojas modales y foco (corrección)

`components/ui/Sheet.tsx` guarda `onClose` en una referencia y su efecto de foco depende solo de `open`. Antes dependía también de `onClose`: las páginas pasan funciones nuevas en cada render, así que cada pulsación volvía a ejecutar el efecto, que movía el foco al panel. El campo perdía el foco y el teclado del iPhone se cerraba tras cada número. Afectaba a todas las hojas con campos de texto. Para evitar que vuelva a pasar, cualquier efecto de una hoja que mueva el foco debe depender solo de `open`.

## Pruebas

- `npm run check:library`: integridad de la biblioteca y simulación del planificador.
- `npm run check:dishes`: 18 comprobaciones de Mis platos (un ingrediente, cinco, cambio de cantidad, borrar ingrediente, raciones, unidades, guardar, persistencia JSON, menú semanal y compra, registrar 1 y ½ ración, suma del día, borrar consumo, editar, historial intacto, duplicar, borrar plato, datos incompletos).
- `npm run typecheck` y `npm run build`.

## Pendiente

- Cuentas y sincronización con Supabase (migraciones 0001–0003 preparadas).
- Fotos reales para la biblioteca (ahora portadas ilustradas, marcadas como tales).
- Más recetas sin gluten para perfiles vegetarianos/veganos.
