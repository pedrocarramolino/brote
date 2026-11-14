import { titled, type TRow } from '../build';

// Recetas con gnocchi (ñoquis de patata). Cantidades por ración; el gnocchi se pesa tal cual
// se compra (fresco, sin cocer). [id, título, descripción, cocina, franjas, min, dificultad,
// raciones, etiquetas, ingredientes por ración, pasos, principal?]

const comidas: TRow[] = [
  ['gnocchi-pesto-tomate-cherry', 'Gnocchi Genovese', 'Gnocchi salteados con pesto de albahaca, tomates cherry y parmesano', 'it', 'com,cen', 15, 'f', 1, 'rapida',
    'gnocchi 200, pesto 20, tomate_cherry 100, parmesano 10',
    ['Cuece los gnocchi en agua hirviendo con sal hasta que suban a la superficie, unos 2 minutos.', 'Saltea los tomates cherry partidos 3 minutos y añade los gnocchi escurridos.', 'Retira del fuego, mezcla con el pesto y sirve con el parmesano.'], 'cereal'],
  ['gnocchi-tomate-mozzarella-horno', 'Gnocchi alla Sorrentina', 'Gnocchi gratinados al horno con salsa de tomate, mozzarella y albahaca', 'it', 'com', 30, 'f', 2, 'horno',
    'gnocchi 200, tomate_triturado 150, mozzarella 40, albahaca 3, aceite 5, ajo 3',
    ['Sofríe el ajo con el aceite, añade el tomate y cuece 10 minutos con sal y albahaca.', 'Cuece los gnocchi 2 minutos, escúrrelos y mézclalos con la salsa en una fuente.', 'Cubre con la mozzarella y gratina a 220 °C 10 minutos.'], 'cereal'],
  ['gnocchi-gorgonzola-nueces', 'Gnocchi Cremosos al Roquefort', 'Gnocchi con salsa ligera de queso roquefort, espinacas y nueces', 'it', 'com', 15, 'f', 1, 'rapida',
    'gnocchi 200, roquefort 20, leche 60, espinacas 50, nueces 10',
    ['Funde el roquefort con la leche a fuego suave hasta tener una salsa.', 'Cuece los gnocchi 2 minutos y escúrrelos.', 'Mézclalos con la salsa y las espinacas hasta que se ablanden y sirve con las nueces picadas.'], 'cereal'],
  ['gnocchi-pollo-champinones', 'Gnocchi con Pollo y Champiñones', 'Gnocchi salteados con pechuga de pollo, champiñones y un toque de nata ligera', 'it', 'com', 20, 'f', 1, 'alta_proteina',
    'gnocchi 170, pollo 110, champinones 100, nata_ligera 30, aceite 5, ajo 3',
    ['Dora el pollo en dados con el aceite y retíralo.', 'Saltea el ajo y los champiñones laminados 5 minutos; añade la nata y el pollo.', 'Cuece los gnocchi 2 minutos, escúrrelos y mézclalos con la salsa.'], 'pollo'],
  ['gnocchi-ragu-ternera', 'Gnocchi al Ragú', 'Gnocchi con ragú de carne picada de ternera, tomate y zanahoria', 'it', 'com', 40, 'm', 4, 'batch',
    'gnocchi 180, ternera_picada_95 90, tomate_triturado 120, zanahoria 30, cebolla 30, aceite 5, parmesano 8',
    ['Sofríe la cebolla y la zanahoria picadas con el aceite 8 minutos.', 'Añade la carne, dórala y agrega el tomate; cuece 20 minutos.', 'Cuece los gnocchi 2 minutos, mézclalos con el ragú y sirve con el parmesano.'], 'ternera'],
  ['gnocchi-salmon-espinacas', 'Gnocchi Nordic', 'Gnocchi con salmón, espinacas y salsa de queso crema y limón', 'int', 'com,cen', 20, 'f', 1, 'alta_proteina',
    'gnocchi 170, salmon 100, espinacas 60, queso_crema 20, limon 5',
    ['Haz el salmón a la plancha y desmígalo.', 'Funde el queso crema con un poco de agua de cocción y el limón; añade las espinacas.', 'Cuece los gnocchi 2 minutos y mézclalo todo.'], 'pescado_azul'],
  ['gnocchi-brocoli-anchoas', 'Gnocchi con Brócoli y Anchoas', 'Gnocchi salteados con brócoli, anchoas, ajo y parmesano', 'it', 'com,cen', 20, 'f', 1, 'rapida',
    'gnocchi 180, brocoli 120, anchoas 8, ajo 3, aceite 6, parmesano 8',
    ['Cuece el brócoli en ramitos 4 minutos y, en la misma agua, los gnocchi hasta que suban.', 'Deshaz las anchoas con el ajo y el aceite en una sartén.', 'Saltea el brócoli y los gnocchi en la sartén y sirve con el parmesano.'], 'cereal'],
  ['gnocchi-vieiras-guisantes', 'Gnocchi del Cantábrico', 'Gnocchi con zamburiñas, guisantes y ajo', 'es', 'com', 20, 'm', 1, '',
    'gnocchi 170, zamburinas 100, guisantes 60, ajo 3, aceite 6, perejil 3',
    ['Saltea el ajo con el aceite y añade los guisantes 4 minutos.', 'Marca las zamburiñas 1 minuto por lado.', 'Cuece los gnocchi 2 minutos y mézclalos con los guisantes, las zamburiñas y el perejil.'], 'marisco'],
];

const cenas: TRow[] = [
  ['gnocchi-verduras-plancha', 'Gnocchi Primavera', 'Gnocchi dorados en sartén con calabacín, pimiento y tomate cherry', 'med', 'cen,com', 20, 'f', 1, 'rapida ligera',
    'gnocchi 150, calabacin 100, pimiento 60, tomate_cherry 80, aceite 6',
    ['Dora los gnocchi sin cocer en la sartén con la mitad del aceite 6 minutos, hasta que estén crujientes.', 'Saltea las verduras en tiras con el resto del aceite.', 'Mézclalo todo con orégano y sal.'], 'cereal'],
  ['gnocchi-pavo-espinacas-ligero', 'Gnocchi Fit', 'Gnocchi con pechuga de pavo, espinacas y tomate', 'it', 'cen,com', 20, 'f', 1, 'alta_proteina ligera',
    'gnocchi 140, pavo 110, espinacas 60, tomate_triturado 100, aceite 5',
    ['Dora el pavo en tiras con el aceite.', 'Añade el tomate y cuece 5 minutos; incorpora las espinacas.', 'Cuece los gnocchi 2 minutos y mézclalos con la salsa.'], 'pavo'],
  ['gnocchi-setas-provolone', 'Gnocchi del Bosque', 'Gnocchi con setas salteadas y provolone fundido', 'it', 'cen', 20, 'f', 1, '',
    'gnocchi 150, setas 120, provolone 25, ajo 3, aceite 6, perejil 3',
    ['Saltea las setas con el ajo y el aceite 6 minutos.', 'Cuece los gnocchi 2 minutos y añádelos a la sartén.', 'Pon el provolone en dados por encima y tapa hasta que funda; termina con el perejil.'], 'cereal'],
  ['gnocchi-tofu-pesto-vegano', 'Gnocchi Verdes Veganos', 'Gnocchi con tofu dorado, judías verdes y salsa de albahaca, aceite y piñones', 'it', 'cen,com', 20, 'f', 1, '',
    'gnocchi 150, tofu 100, judias_verdes 80, albahaca 6, pinones 8, aceite 8',
    ['Tritura la albahaca con los piñones, el aceite, ajo y sal.', 'Dora el tofu en dados y cuece las judías verdes 5 minutos.', 'Cuece los gnocchi 2 minutos y mézclalo todo con la salsa.'], 'proteina_vegetal'],
];

export const GNOCCHI_COMIDA = titled('comida', comidas);
export const GNOCCHI_CENA = titled('cena', cenas);
