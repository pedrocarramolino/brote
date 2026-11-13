import { titled, type TRow } from '../build';

// Hamburguesas de todos los tipos. Las carnes se indican YA HECHAS (alimentos «Hamburguesa de … (hecha)»,
// 1 unidad ≈ 100 g hecha ≈ 130 g en crudo), con valores de USDA o, para wagyu y mixta, una estimación
// indicada en el propio alimento. Las de pescado y legumbres se hacen con sus ingredientes.
// [id, título, descripción, cocina, franjas, min, dificultad, raciones, etiquetas, ingredientes por ración, pasos, principal?]

const comidas: TRow[] = [
  ['burger-clasica-ternera', 'Burger Clásica de la Casa', 'Hamburguesa de ternera con lechuga, tomate, cebolla y kétchup en pan de hamburguesa', 'am', 'com,cen', 15, 'f', 1, 'rapida',
    'hamburguesa_ternera 100, pan_burger 70, lechuga 20, tomate 40, cebolla 15, ketchup 15',
    ['Haz la hamburguesa a la plancha muy caliente 3 o 4 minutos por lado, con sal y pimienta.', 'Tuesta el pan por dentro.', 'Monta con la lechuga, el tomate, la cebolla en aros y el kétchup.'], 'ternera'],
  ['burger-doble-cheddar', 'Doble Cheese Burger', 'Dos hamburguesas finas de vacuno 85/15 con cheddar fundido, cebolla, mostaza y kétchup', 'am', 'com', 15, 'f', 1, 'rapida',
    'hamburguesa_vacuno_85 150, cheddar 30, pan_burger 70, cebolla 20, mostaza 5, ketchup 10',
    ['Haz las dos hamburguesas a la plancha 2 o 3 minutos por lado.', 'Pon una loncha de cheddar sobre cada una al darles la vuelta y tapa para que funda.', 'Monta en el pan tostado con la cebolla picada, la mostaza y el kétchup.'], 'ternera'],
  ['burger-ternera-fit', 'Fit Burger', 'Hamburguesa de ternera magra 90/10 en pan integral con rúcula, tomate, cebolla morada y queso fresco', 'am', 'com,cen', 15, 'f', 1, 'rapida alta_proteina',
    'hamburguesa_ternera_magra 100, pan_hamburguesa 70, rucula 20, tomate 50, cebolla_morada 15, queso_fresco 30, mostaza 5',
    ['Haz la hamburguesa a la plancha 3 o 4 minutos por lado.', 'Tuesta el pan integral.', 'Monta con la rúcula, el tomate, la cebolla morada, el queso fresco en lonchas y la mostaza.'], 'ternera'],
  ['burger-wagyu-cebolla', 'Wagyu Burger Gourmet', 'Hamburguesa de wagyu con cebolla pochada, rúcula y tomate en pan de hamburguesa', 'am', 'com', 30, 'm', 1, '',
    'hamburguesa_wagyu 100, pan_burger 70, cebolla 50, rucula 15, tomate 30, aceite 4',
    ['Pocha la cebolla en tiras con el aceite a fuego suave 20 minutos, hasta que esté dorada y dulce.', 'Haz la hamburguesa a la plancha muy caliente 2 o 3 minutos por lado (mejor al punto) y déjala reposar 2 minutos.', 'Monta en el pan tostado con la rúcula, el tomate y la cebolla.'], 'ternera'],
  ['burger-pollo-mediterranea', 'Chicken Burger Mediterránea', 'Hamburguesa de pollo con aguacate, tomate, lechuga y salsa de yogur', 'med', 'com,cen', 20, 'f', 1, 'alta_proteina',
    'hamburguesa_pollo 100, pan_burger 70, lechuga 20, tomate 40, aguacate 30, yogur_griego 25',
    ['Haz la hamburguesa de pollo a la plancha 5 minutos por lado, hasta que esté hecha por dentro.', 'Mezcla el yogur con ajo en polvo, limón y sal.', 'Monta en el pan con la lechuga, el tomate, el aguacate en láminas y la salsa.'], 'pollo'],
  ['burger-pollo-crujiente', 'Crispy Chicken Burger', 'Hamburguesa de pollo empanada y crujiente con lechuga, tomate y mayonesa ligera', 'am', 'com', 20, 'f', 1, '',
    'hamburguesa_pollo_empanada 90, pan_burger 70, lechuga 25, tomate 30, mayonesa_light 10',
    ['Hornea la hamburguesa empanada a 200 °C 15 minutos, dándole la vuelta a la mitad (o hazla en freidora de aire).', 'Tuesta el pan.', 'Monta con la lechuga, el tomate y la mayonesa.'], 'pollo'],
  ['burger-cerdo-barbacoa', 'BBQ Pork Burger', 'Hamburguesa de cerdo con salsa barbacoa y ensalada de col y zanahoria', 'am', 'com', 20, 'f', 1, '',
    'hamburguesa_cerdo 100, pan_burger 70, salsa_barbacoa 15, repollo 40, zanahoria 20, mayonesa_light 8',
    ['Ralla la col y la zanahoria y mézclalas con la mayonesa, vinagre y sal.', 'Haz la hamburguesa a la plancha 4 o 5 minutos por lado y píntala con la salsa barbacoa al final.', 'Monta en el pan con la ensalada de col.'], 'cerdo'],
  ['burger-mixta-piquillos', 'Burger de la Abuela', 'Hamburguesa mixta de ternera y cerdo con pimientos del piquillo y lechuga', 'es', 'com,cen', 20, 'f', 1, 'tradicional',
    'hamburguesa_mixta 100, pan_burger 70, piquillos 40, lechuga 20, aceite 3',
    ['Confita los piquillos en tiras con el aceite y una pizca de azúcar 5 minutos.', 'Haz la hamburguesa a la plancha 4 minutos por lado.', 'Monta en el pan con la lechuga y los piquillos.'], 'ternera'],
  ['burger-venado-setas', 'Burger Montaraz de Venado', 'Hamburguesa de venado con setas salteadas, cebolla y rúcula', 'es', 'com', 25, 'm', 1, 'alta_proteina',
    'hamburguesa_venado 100, pan_burger 70, setas 60, cebolla 20, rucula 15, aceite 4',
    ['Saltea las setas y la cebolla con el aceite, ajo y tomillo 6 minutos.', 'Haz la hamburguesa a la plancha 3 minutos por lado: es muy magra y se seca si se pasa.', 'Monta en el pan con la rúcula y las setas.'], 'ternera'],
  ['burger-bisonte-aguacate', 'Bison Burger', 'Hamburguesa de bisonte con aguacate, tomate, lechuga y cebolla morada', 'am', 'com', 20, 'f', 1, 'alta_proteina',
    'hamburguesa_bisonte 100, pan_burger 70, aguacate 30, tomate 40, lechuga 20, cebolla_morada 15',
    ['Haz la hamburguesa a la plancha 3 o 4 minutos por lado.', 'Tuesta el pan.', 'Monta con la lechuga, el tomate, el aguacate y la cebolla morada.'], 'ternera'],
  ['burger-salmon-yogur', 'Salmon Burger Nórdica', 'Hamburguesa casera de salmón con pepino y salsa de yogur y eneldo', 'int', 'com,cen', 25, 'm', 1, 'alta_proteina',
    'salmon 120, pan_rallado 10, huevo 15, pan_burger 70, pepino 30, yogur_griego 25, lechuga 20',
    ['Pica el salmón a cuchillo y mézclalo con el huevo, el pan rallado, sal y eneldo; forma la hamburguesa.', 'Hazla a la plancha 3 minutos por lado.', 'Mezcla el yogur con eneldo y limón y monta en el pan con la lechuga y el pepino en láminas.'], 'pescado_azul'],
  ['burger-atun-sesamo', 'Tuna Burger', 'Hamburguesa de atún fresco con aguacate, cebolla morada y lechuga', 'as', 'com', 20, 'm', 1, 'alta_proteina',
    'atun_fresco 120, huevo 10, pan_burger 70, aguacate 30, cebolla_morada 15, lechuga 20',
    ['Pica el atún a cuchillo y mézclalo con el huevo, jengibre rallado y sal; forma la hamburguesa.', 'Márcala a la plancha muy caliente 1 o 2 minutos por lado.', 'Monta en el pan con la lechuga, el aguacate y la cebolla.'], 'atun'],
  ['burger-portobello', 'Burger Portobello Caprese', 'Champiñones portobello a la plancha con mozzarella, pesto, tomate y rúcula', 'it', 'com,cen', 20, 'f', 1, '',
    'portobello 170, mozzarella 30, pesto 10, pan_burger 70, tomate 40, rucula 15, aceite 4',
    ['Haz los portobello a la plancha con el aceite 4 minutos por lado.', 'Pon la mozzarella encima los últimos minutos y tapa para que funda.', 'Monta en el pan con el pesto, el tomate y la rúcula.'], 'verdura'],
  ['burger-vegetal-soja', 'Veggie Burger Urbana', 'Hamburguesa vegetal de soja con lechuga, tomate, aguacate y kétchup', 'am', 'com,cen', 15, 'f', 1, 'rapida',
    'hamburguesa_vegetal 90, pan_hamburguesa 70, lechuga 20, tomate 40, aguacate 30, ketchup 10',
    ['Haz la hamburguesa vegetal a la plancha 4 minutos por lado.', 'Tuesta el pan.', 'Monta con la lechuga, el tomate, el aguacate y el kétchup.'], 'proteina_vegetal'],
  ['burger-lentejas-vegana', 'Burger Vegana de Lentejas', 'Hamburguesa vegana de lentejas y avena con lechuga, tomate y aguacate', 'int', 'com,cen', 30, 'm', 2, 'batch',
    'lentejas 120, avena 20, cebolla 20, pan_burger 70, lechuga 20, tomate 40, aguacate 30, aceite 5',
    ['Tritura a medias las lentejas escurridas con la avena, la cebolla picada, comino y sal; deja reposar 10 minutos.', 'Forma las hamburguesas y dóralas con el aceite 4 minutos por lado.', 'Monta en el pan con la lechuga, el tomate y el aguacate.'], 'legumbre'],
  ['burger-quinoa-alubias', 'Burger Verde de Quinoa', 'Hamburguesa vegana de quinoa, alubias y espinacas con tomate', 'int', 'com,cen', 35, 'm', 2, 'batch',
    'quinoa 30, alubias 100, espinacas 30, pan_burger 70, tomate 40, lechuga 20, aceite 5',
    ['Cuece la quinoa 15 minutos y escúrrela bien.', 'Chafa las alubias con la quinoa, las espinacas picadas, ajo y pimentón; forma las hamburguesas.', 'Dóralas con el aceite 4 minutos por lado y monta en el pan con el tomate y la lechuga.'], 'legumbre'],
];

const cenas: TRow[] = [
  ['burger-pavo-ligera', 'Turkey Burger Ligera', 'Hamburguesa de pavo extramagra en pan integral con espinacas, tomate y mostaza', 'am', 'cen,com', 15, 'f', 1, 'rapida ligera alta_proteina',
    'hamburguesa_pavo_magra 100, pan_hamburguesa 70, espinacas 20, tomate 40, cebolla_morada 15, mostaza 5',
    ['Haz la hamburguesa de pavo a la plancha 4 o 5 minutos por lado.', 'Tuesta el pan integral.', 'Monta con las espinacas, el tomate, la cebolla morada y la mostaza.'], 'pavo'],
  ['hamburguesa-al-plato', 'Hamburguesa al Plato', 'Hamburguesa de ternera magra sin pan, con patatas al horno y ensalada de lechuga y tomate', 'es', 'cen,com', 35, 'f', 1, 'alta_proteina',
    'hamburguesa_ternera_magra 120, patata 150, lechuga 60, tomate 60, aceite 6',
    ['Asa la patata en gajos con la mitad del aceite y pimentón a 210 °C 25 minutos.', 'Haz la hamburguesa a la plancha 4 minutos por lado.', 'Sirve con la ensalada aliñada con el resto del aceite.'], 'ternera'],
];

export const HAMBURGUESAS_COMIDA = titled('comida', comidas);
export const HAMBURGUESAS_CENA = titled('cena', cenas);
