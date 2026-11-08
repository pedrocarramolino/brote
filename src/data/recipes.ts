import type { RecipeDraft } from './recipeLibrary/build';

/*
 * Primeras recetas del catálogo. Cantidades por ración.
 * Los valores nutricionales NO están escritos a mano: se calculan a partir de
 * los ingredientes y de la base de alimentos (src/data/foods.ts), de modo que
 * cualquier total es trazable hasta un alimento y una cantidad concretos.
 */

const r = (x: Omit<RecipeDraft, 'servings'> & { servings?: number }): RecipeDraft => ({ servings: 1, ...x });

/** Recetas originales de la app (v1). Se conservan con sus identificadores para no romper menús guardados. */
export const LEGACY_RECIPES: RecipeDraft[] = [
  // ---------------- Desayunos ----------------
  r({
    id: 'porridge-platano', name: 'Porridge de avena con plátano y nueces', slots: ['desayuno'], minutes: 10, hue: 38, icon: 'wheat', tags: ['rapida'],
    ingredients: [{ foodId: 'avena', amount: 50 }, { foodId: 'leche', amount: 200 }, { foodId: 'platano', amount: 60 }, { foodId: 'nueces', amount: 10 }],
    steps: ['Calienta la leche a fuego medio en un cazo pequeño.', 'Añade los copos de avena y remueve durante 4–5 minutos hasta que espese.', 'Sirve en un bol con el plátano en rodajas y las nueces troceadas. Puedes añadir canela al gusto.'],
  }),
  r({
    id: 'tostada-aguacate-huevo', name: 'Tostadas integrales con aguacate y huevo', slots: ['desayuno'], minutes: 12, hue: 95, icon: 'egg', tags: ['rapida', 'alta_proteina'],
    ingredients: [{ foodId: 'pan_integral', amount: 60 }, { foodId: 'aguacate', amount: 50 }, { foodId: 'huevo', amount: 55 }, { foodId: 'tomate', amount: 40 }, { foodId: 'aceite', amount: 3 }],
    steps: ['Tuesta el pan.', 'Cuece el huevo 7 minutos (o hazlo a la plancha con unas gotas de aceite).', 'Machaca el aguacate con una pizca de sal y extiéndelo sobre las tostadas.', 'Añade el tomate en láminas y el huevo por encima.'],
  }),
  r({
    id: 'yogur-frutos-rojos', name: 'Yogur griego con arándanos y chía', slots: ['desayuno', 'merienda'], minutes: 3, hue: 280, icon: 'milk', tags: ['rapida', 'sin_coccion', 'alta_proteina'],
    ingredients: [{ foodId: 'yogur_griego', amount: 200 }, { foodId: 'frutos_rojos', amount: 80 }, { foodId: 'chia', amount: 10 }, { foodId: 'miel', amount: 8 }],
    steps: ['Sirve el yogur en un bol.', 'Añade los arándanos, las semillas de chía y un hilo de miel.'],
  }),
  r({
    id: 'tostada-tomate-pavo', name: 'Tostada con tomate y pavo', slots: ['desayuno', 'merienda'], minutes: 5, hue: 12, icon: 'sandwich', tags: ['rapida'],
    ingredients: [{ foodId: 'pan_integral', amount: 60 }, { foodId: 'tomate', amount: 60 }, { foodId: 'aceite', amount: 5 }, { foodId: 'pavo_fiambre', amount: 40 }],
    steps: ['Tuesta el pan.', 'Ralla el tomate y extiéndelo sobre el pan.', 'Añade el aceite y el pavo en lonchas.'],
  }),
  r({
    id: 'overnight-oats', name: 'Avena remojada con fresas y cacahuete', slots: ['desayuno'], minutes: 5, hue: 350, icon: 'wheat', tags: ['sin_coccion', 'batch'],
    ingredients: [{ foodId: 'avena', amount: 45 }, { foodId: 'bebida_soja', amount: 180 }, { foodId: 'chia', amount: 10 }, { foodId: 'fresas', amount: 80 }, { foodId: 'crema_cacahuete', amount: 10 }],
    steps: ['La noche anterior, mezcla la avena, la chía y la bebida de soja en un tarro.', 'Tapa y deja en la nevera al menos 6 horas.', 'Por la mañana, añade las fresas troceadas y la crema de cacahuete.'],
  }),
  r({
    id: 'tortilla-espinacas', name: 'Tortilla francesa con espinacas', slots: ['desayuno', 'cena'], minutes: 8, hue: 60, icon: 'egg', tags: ['rapida', 'alta_proteina'],
    ingredients: [{ foodId: 'huevo', amount: 110 }, { foodId: 'espinacas', amount: 40 }, { foodId: 'pan_integral', amount: 40 }, { foodId: 'aceite', amount: 4 }],
    steps: ['Saltea las espinacas 1 minuto con unas gotas de aceite.', 'Bate los huevos, añade las espinacas y cuaja la tortilla a fuego medio.', 'Acompaña con el pan.'],
  }),
  r({
    id: 'tofu-revuelto', name: 'Revuelto de tofu con espinacas', slots: ['desayuno', 'cena'], minutes: 10, hue: 48, icon: 'salad', tags: ['rapida', 'alta_proteina'],
    ingredients: [{ foodId: 'tofu', amount: 120 }, { foodId: 'espinacas', amount: 30 }, { foodId: 'pan_integral', amount: 50 }, { foodId: 'aceite', amount: 4 }, { foodId: 'tomate', amount: 40 }],
    steps: ['Desmenuza el tofu con un tenedor.', 'Saltéalo 4 minutos con el aceite; añade cúrcuma y pimienta si quieres color.', 'Incorpora las espinacas hasta que se ablanden.', 'Sirve con el pan tostado y el tomate.'],
  }),

  // ---------------- Media mañana ----------------
  r({
    id: 'manzana-almendras', name: 'Manzana y almendras', slots: ['mediamanana', 'merienda'], minutes: 1, hue: 5, icon: 'apple', tags: ['rapida', 'sin_coccion'],
    ingredients: [{ foodId: 'manzana', amount: 150 }, { foodId: 'almendras', amount: 20 }],
    steps: ['Lava la manzana y acompáñala con un puñado de almendras.'],
  }),
  r({
    id: 'yogur-kiwi', name: 'Yogur natural con kiwi', slots: ['mediamanana', 'merienda'], minutes: 2, hue: 85, icon: 'milk', tags: ['rapida', 'sin_coccion'],
    ingredients: [{ foodId: 'yogur', amount: 125 }, { foodId: 'kiwi', amount: 80 }],
    steps: ['Pela y trocea el kiwi.', 'Mézclalo con el yogur.'],
  }),
  r({
    id: 'tortitas-hummus', name: 'Tortitas de arroz con hummus y pepino', slots: ['mediamanana', 'merienda'], minutes: 3, hue: 40, icon: 'cookie', tags: ['rapida', 'sin_coccion'],
    ingredients: [{ foodId: 'tortitas_arroz', amount: 20 }, { foodId: 'hummus', amount: 40 }, { foodId: 'pepino', amount: 50 }],
    steps: ['Unta el hummus sobre las tortitas.', 'Corona con láminas finas de pepino.'],
  }),
  r({
    id: 'platano-cacahuete', name: 'Plátano con crema de cacahuete', slots: ['mediamanana', 'merienda'], minutes: 1, hue: 50, icon: 'apple', tags: ['rapida', 'sin_coccion'],
    ingredients: [{ foodId: 'platano', amount: 100 }, { foodId: 'crema_cacahuete', amount: 12 }],
    steps: ['Pela el plátano y acompáñalo con la crema de cacahuete.'],
  }),
  r({
    id: 'batido-fresas', name: 'Queso batido con fresas', slots: ['mediamanana', 'merienda'], minutes: 2, hue: 345, icon: 'milk', tags: ['rapida', 'sin_coccion', 'alta_proteina'],
    ingredients: [{ foodId: 'queso_batido', amount: 150 }, { foodId: 'fresas', amount: 100 }],
    steps: ['Lava y trocea las fresas.', 'Sírvelas sobre el queso batido.'],
  }),
  r({
    id: 'naranja-nueces', name: 'Naranja y nueces', slots: ['mediamanana', 'merienda'], minutes: 1, hue: 28, icon: 'apple', tags: ['rapida', 'sin_coccion'],
    ingredients: [{ foodId: 'naranja', amount: 150 }, { foodId: 'nueces', amount: 15 }],
    steps: ['Pela la naranja y acompáñala con las nueces.'],
  }),

  // ---------------- Comidas ----------------
  r({
    id: 'pollo-boniato', name: 'Pollo al horno con boniato y brócoli', slots: ['comida', 'cena'], minutes: 35, hue: 25, icon: 'drumstick', tags: ['alta_proteina', 'batch'],
    ingredients: [{ foodId: 'pollo', amount: 150 }, { foodId: 'boniato', amount: 180 }, { foodId: 'brocoli', amount: 120 }, { foodId: 'aceite', amount: 8 }],
    steps: ['Precalienta el horno a 200 °C.', 'Corta el boniato en dados y hornéalo 15 minutos con la mitad del aceite.', 'Añade el pollo en tiras y el brócoli en ramilletes con el resto del aceite.', 'Hornea 15–18 minutos más, hasta que el pollo esté hecho por dentro.'],
  }),
  r({
    id: 'lentejas-verduras', name: 'Lentejas estofadas con verduras', slots: ['comida'], minutes: 25, hue: 30, icon: 'soup', tags: ['batch'],
    ingredients: [{ foodId: 'lentejas', amount: 250 }, { foodId: 'zanahoria', amount: 60 }, { foodId: 'cebolla', amount: 50 }, { foodId: 'pimiento', amount: 50 }, { foodId: 'tomate_triturado', amount: 60 }, { foodId: 'aceite', amount: 8 }],
    steps: ['Pica la cebolla, el pimiento y la zanahoria.', 'Sofríe las verduras con el aceite 8 minutos.', 'Añade el tomate y cocina 5 minutos.', 'Incorpora las lentejas escurridas y un poco de agua; cuece 8 minutos más.'],
  }),
  r({
    id: 'salmon-quinoa', name: 'Salmón con quinoa y judías verdes', slots: ['comida', 'cena'], minutes: 25, hue: 15, icon: 'fish', tags: ['alta_proteina'],
    ingredients: [{ foodId: 'salmon', amount: 130 }, { foodId: 'quinoa', amount: 60 }, { foodId: 'judias_verdes', amount: 120 }, { foodId: 'limon', amount: 10 }, { foodId: 'aceite', amount: 5 }],
    steps: ['Lava la quinoa y cuécela 15 minutos en el doble de agua.', 'Cuece las judías al vapor 8 minutos.', 'Marca el salmón a la plancha 3–4 minutos por lado.', 'Sirve con un chorrito de limón y el aceite en crudo.'],
  }),
  r({
    id: 'pasta-atun', name: 'Pasta integral con atún y tomate', slots: ['comida'], minutes: 20, hue: 8, icon: 'wheat', tags: ['rapida'],
    ingredients: [{ foodId: 'pasta_integral', amount: 80 }, { foodId: 'atun', amount: 80 }, { foodId: 'tomate_triturado', amount: 100 }, { foodId: 'cebolla', amount: 30 }, { foodId: 'aceite', amount: 8 }],
    steps: ['Cuece la pasta según el envase.', 'Sofríe la cebolla picada con el aceite y añade el tomate; cocina 8 minutos.', 'Incorpora el atún escurrido y mezcla con la pasta.'],
  }),
  r({
    id: 'arroz-tofu', name: 'Arroz integral salteado con tofu', slots: ['comida', 'cena'], minutes: 30, hue: 160, icon: 'salad', tags: ['alta_proteina'],
    ingredients: [{ foodId: 'arroz_integral', amount: 70 }, { foodId: 'tofu', amount: 120 }, { foodId: 'brocoli', amount: 80 }, { foodId: 'zanahoria', amount: 50 }, { foodId: 'salsa_soja', amount: 10 }, { foodId: 'aceite', amount: 8 }],
    steps: ['Cuece el arroz integral (unos 25 minutos).', 'Dora el tofu en dados con la mitad del aceite.', 'Saltea el brócoli y la zanahoria con el resto del aceite.', 'Une todo con el arroz y la salsa de soja.'],
  }),
  r({
    id: 'garbanzos-espinacas', name: 'Garbanzos con espinacas', slots: ['comida'], minutes: 15, hue: 70, icon: 'soup', tags: ['rapida'],
    ingredients: [{ foodId: 'garbanzos', amount: 220 }, { foodId: 'espinacas', amount: 100 }, { foodId: 'tomate_triturado', amount: 60 }, { foodId: 'ajo', amount: 5 }, { foodId: 'cebolla', amount: 40 }, { foodId: 'aceite', amount: 8 }],
    steps: ['Sofríe el ajo y la cebolla picados con el aceite.', 'Añade el tomate y una pizca de comino y pimentón.', 'Incorpora los garbanzos escurridos y las espinacas; cocina 5 minutos.'],
  }),
  r({
    id: 'ternera-arroz', name: 'Ternera salteada con arroz y pimientos', slots: ['comida'], minutes: 25, hue: 0, icon: 'beef', tags: ['alta_proteina'],
    ingredients: [{ foodId: 'ternera', amount: 130 }, { foodId: 'arroz', amount: 70 }, { foodId: 'pimiento', amount: 80 }, { foodId: 'cebolla', amount: 40 }, { foodId: 'salsa_soja', amount: 8 }, { foodId: 'aceite', amount: 8 }],
    steps: ['Cuece el arroz.', 'Saltea la ternera en tiras a fuego fuerte 2 minutos y retírala.', 'Saltea el pimiento y la cebolla; vuelve a añadir la ternera y la salsa de soja.', 'Sirve con el arroz.'],
  }),
  r({
    id: 'ensalada-quinoa', name: 'Ensalada de quinoa y garbanzos', slots: ['comida', 'cena'], minutes: 20, hue: 110, icon: 'salad', tags: ['batch'],
    ingredients: [{ foodId: 'quinoa', amount: 50 }, { foodId: 'garbanzos', amount: 120 }, { foodId: 'pepino', amount: 60 }, { foodId: 'tomate', amount: 80 }, { foodId: 'aguacate', amount: 40 }, { foodId: 'limon', amount: 10 }, { foodId: 'aceite', amount: 8 }],
    steps: ['Cuece la quinoa 15 minutos y déjala templar.', 'Trocea el pepino, el tomate y el aguacate.', 'Mezcla con los garbanzos y aliña con limón y aceite.'],
  }),
  r({
    id: 'merluza-papillote', name: 'Merluza en papillote con patata', slots: ['comida', 'cena'], minutes: 30, hue: 200, icon: 'fish', tags: ['ligera'],
    ingredients: [{ foodId: 'merluza', amount: 180 }, { foodId: 'patata', amount: 200 }, { foodId: 'calabacin', amount: 100 }, { foodId: 'cebolla', amount: 30 }, { foodId: 'aceite', amount: 8 }],
    steps: ['Precalienta el horno a 190 °C.', 'Corta la patata en láminas finas y hornéala 15 minutos.', 'Coloca la merluza, el calabacín y la cebolla sobre papel de horno, añade el aceite y cierra el paquete.', 'Hornea 12 minutos junto a la patata.'],
  }),

  // ---------------- Meriendas ----------------
  r({
    id: 'tostada-queso', name: 'Tostada con queso fresco y tomate', slots: ['merienda', 'desayuno'], minutes: 4, hue: 20, icon: 'sandwich', tags: ['rapida'],
    ingredients: [{ foodId: 'pan_integral', amount: 40 }, { foodId: 'queso_fresco', amount: 50 }, { foodId: 'tomate', amount: 40 }],
    steps: ['Tuesta el pan.', 'Añade el queso fresco y el tomate en rodajas.'],
  }),
  r({
    id: 'batido-platano', name: 'Batido de plátano y avena', slots: ['merienda', 'desayuno'], minutes: 3, hue: 52, icon: 'milk', tags: ['rapida', 'sin_coccion'],
    ingredients: [{ foodId: 'leche', amount: 250 }, { foodId: 'platano', amount: 100 }, { foodId: 'avena', amount: 15 }],
    steps: ['Tritura todos los ingredientes hasta obtener una textura fina.'],
  }),
  r({
    id: 'griego-nueces', name: 'Yogur griego con nueces y miel', slots: ['merienda'], minutes: 2, hue: 35, icon: 'milk', tags: ['rapida', 'sin_coccion', 'alta_proteina'],
    ingredients: [{ foodId: 'yogur_griego', amount: 150 }, { foodId: 'nueces', amount: 15 }, { foodId: 'miel', amount: 8 }],
    steps: ['Sirve el yogur con las nueces troceadas y la miel.'],
  }),
  r({
    id: 'crudites-hummus', name: 'Bastones de zanahoria con hummus', slots: ['merienda', 'mediamanana'], minutes: 5, hue: 25, icon: 'carrot', tags: ['rapida', 'sin_coccion'],
    ingredients: [{ foodId: 'zanahoria', amount: 100 }, { foodId: 'hummus', amount: 50 }],
    steps: ['Pela la zanahoria y córtala en bastones.', 'Acompáñala con el hummus.'],
  }),
  r({
    id: 'bocadillo-pavo', name: 'Bocadillo pequeño de pavo', slots: ['merienda'], minutes: 3, hue: 30, icon: 'sandwich', tags: ['rapida'],
    ingredients: [{ foodId: 'pan_integral', amount: 50 }, { foodId: 'pavo_fiambre', amount: 40 }, { foodId: 'tomate', amount: 30 }],
    steps: ['Abre el pan, añade el tomate en rodajas y el pavo.'],
  }),

  // ---------------- Cenas ----------------
  r({
    id: 'tortilla-calabacin', name: 'Tortilla de calabacín con ensalada', slots: ['cena'], minutes: 20, hue: 75, icon: 'egg', tags: ['ligera'],
    ingredients: [{ foodId: 'huevo', amount: 120 }, { foodId: 'calabacin', amount: 150 }, { foodId: 'cebolla', amount: 30 }, { foodId: 'aceite', amount: 8 }, { foodId: 'lechuga', amount: 60 }, { foodId: 'tomate', amount: 80 }],
    steps: ['Pocha el calabacín y la cebolla en dados con el aceite 10 minutos.', 'Bate los huevos, mezcla con la verdura y cuaja la tortilla por ambos lados.', 'Sirve con la lechuga y el tomate aliñados.'],
  }),
  r({
    id: 'crema-verduras', name: 'Crema de verduras con huevo', slots: ['cena'], minutes: 30, hue: 90, icon: 'soup', tags: ['ligera', 'batch'],
    ingredients: [{ foodId: 'calabacin', amount: 150 }, { foodId: 'zanahoria', amount: 80 }, { foodId: 'cebolla', amount: 40 }, { foodId: 'patata', amount: 80 }, { foodId: 'caldo', amount: 200 }, { foodId: 'aceite', amount: 6 }, { foodId: 'huevo', amount: 55 }],
    steps: ['Rehoga la cebolla con el aceite.', 'Añade el resto de verduras troceadas y el caldo; cuece 20 minutos.', 'Tritura hasta obtener una crema fina.', 'Sirve con el huevo cocido picado por encima.'],
  }),
  r({
    id: 'pescado-horno', name: 'Merluza con verduras asadas', slots: ['cena', 'comida'], minutes: 30, hue: 210, icon: 'fish', tags: ['ligera', 'alta_proteina'],
    ingredients: [{ foodId: 'merluza', amount: 160 }, { foodId: 'berenjena', amount: 100 }, { foodId: 'pimiento', amount: 80 }, { foodId: 'calabacin', amount: 80 }, { foodId: 'aceite', amount: 8 }],
    steps: ['Precalienta el horno a 200 °C.', 'Asa las verduras troceadas con el aceite 18 minutos.', 'Añade la merluza encima y hornea 10 minutos más.'],
  }),
  r({
    id: 'ensalada-pollo', name: 'Ensalada templada de pollo y aguacate', slots: ['cena', 'comida'], minutes: 15, hue: 130, icon: 'salad', tags: ['rapida', 'alta_proteina'],
    ingredients: [{ foodId: 'pollo', amount: 120 }, { foodId: 'lechuga', amount: 80 }, { foodId: 'tomate', amount: 80 }, { foodId: 'pepino', amount: 60 }, { foodId: 'aguacate', amount: 40 }, { foodId: 'aceite', amount: 6 }],
    steps: ['Haz el pollo a la plancha y córtalo en tiras.', 'Monta la ensalada con la lechuga, el tomate, el pepino y el aguacate.', 'Añade el pollo templado y aliña.'],
  }),
  r({
    id: 'wrap-pollo', name: 'Wrap integral de pollo y verduras', slots: ['cena', 'comida'], minutes: 15, hue: 45, icon: 'sandwich', tags: ['rapida', 'alta_proteina'],
    ingredients: [{ foodId: 'tortilla_trigo', amount: 60 }, { foodId: 'pollo', amount: 100 }, { foodId: 'pimiento', amount: 50 }, { foodId: 'lechuga', amount: 30 }, { foodId: 'yogur', amount: 30 }],
    steps: ['Saltea el pollo y el pimiento en tiras.', 'Calienta la tortilla en una sartén.', 'Rellena con el pollo, el pimiento, la lechuga y el yogur como salsa. Enrolla.'],
  }),
  r({
    id: 'revuelto-gambas', name: 'Revuelto de champiñones y langostinos', slots: ['cena'], minutes: 15, hue: 18, icon: 'fish', tags: ['rapida', 'alta_proteina'],
    ingredients: [{ foodId: 'langostinos', amount: 120 }, { foodId: 'champinones', amount: 150 }, { foodId: 'huevo', amount: 55 }, { foodId: 'ajo', amount: 5 }, { foodId: 'aceite', amount: 6 }, { foodId: 'pan_integral', amount: 30 }],
    steps: ['Saltea el ajo laminado y los champiñones con el aceite.', 'Añade los langostinos y cocina 2 minutos.', 'Incorpora el huevo batido y remueve hasta que cuaje.', 'Acompaña con el pan.'],
  }),
  r({
    id: 'bowl-tofu', name: 'Bowl de tofu, boniato y garbanzos', slots: ['cena', 'comida'], minutes: 30, hue: 150, icon: 'salad', tags: ['alta_proteina', 'batch'],
    ingredients: [{ foodId: 'tofu', amount: 120 }, { foodId: 'boniato', amount: 120 }, { foodId: 'espinacas', amount: 50 }, { foodId: 'garbanzos', amount: 60 }, { foodId: 'aceite', amount: 6 }],
    steps: ['Asa el boniato en dados a 200 °C durante 20 minutos.', 'Dora el tofu en la sartén con el aceite.', 'Monta el bowl con las espinacas, el boniato, el tofu y los garbanzos.'],
  }),
  r({
    id: 'calabacin-relleno', name: 'Calabacín relleno de pavo', slots: ['cena'], minutes: 35, hue: 100, icon: 'carrot', tags: ['alta_proteina'],
    ingredients: [{ foodId: 'calabacin', amount: 250 }, { foodId: 'pavo', amount: 120 }, { foodId: 'cebolla', amount: 40 }, { foodId: 'tomate_triturado', amount: 60 }, { foodId: 'mozzarella', amount: 30 }, { foodId: 'aceite', amount: 5 }],
    steps: ['Parte el calabacín a lo largo y vacíalo; hornea las barcas 10 minutos a 200 °C.', 'Sofríe la cebolla, la pulpa del calabacín y el pavo picado; añade el tomate.', 'Rellena las barcas, cubre con la mozzarella y gratina 10 minutos.'],
  }),
  r({
    id: 'sopa-lentejas', name: 'Sopa de lentejas y verduras', slots: ['cena'], minutes: 20, hue: 32, icon: 'soup', tags: ['ligera', 'batch'],
    ingredients: [{ foodId: 'lentejas', amount: 180 }, { foodId: 'caldo', amount: 250 }, { foodId: 'zanahoria', amount: 60 }, { foodId: 'cebolla', amount: 40 }, { foodId: 'tomate', amount: 50 }, { foodId: 'aceite', amount: 6 }],
    steps: ['Sofríe la cebolla y la zanahoria picadas con el aceite.', 'Añade el tomate rallado, el caldo y las lentejas.', 'Cuece 10 minutos y ajusta de sal.'],
  }),
  r({
    id: 'cuscus-verduras', name: 'Cuscús con verduras y garbanzos', slots: ['cena', 'comida'], minutes: 15, hue: 42, icon: 'wheat', tags: ['rapida'],
    ingredients: [{ foodId: 'cuscus', amount: 60 }, { foodId: 'garbanzos', amount: 100 }, { foodId: 'calabacin', amount: 80 }, { foodId: 'pimiento', amount: 60 }, { foodId: 'aceite', amount: 6 }],
    steps: ['Hidrata el cuscús con el mismo volumen de agua caliente 5 minutos.', 'Saltea el calabacín y el pimiento en dados con el aceite.', 'Mezcla con el cuscús y los garbanzos.'],
  }),
];
