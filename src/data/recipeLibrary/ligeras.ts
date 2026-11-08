import { rows, type Row } from './build';

// ---------------- Media mañana ----------------
const mediaManana: Row[] = [
  ['pera-queso-fresco', 'Pera con queso fresco', 'mm,mer', 2, 'f', 1, 'sin_coccion', 'pera 150, queso_fresco 30', ['Corta la pera en gajos y sírvela con el queso en dados.']],
  ['mandarinas-pistachos', 'Mandarinas y pistachos', 'mm,mer', 1, 'f', 1, 'sin_coccion', 'mandarina 160, pistachos 15', ['Pela las mandarinas y acompáñalas con los pistachos.']],
  ['yogur-granada', 'Yogur natural con granada', 'mm,mer', 3, 'f', 1, 'sin_coccion', 'yogur 125, granada 60', ['Desgrana la granada y añádela al yogur.']],
  ['kefir-platano', 'Vaso de kéfir con plátano', 'mm,mer', 2, 'f', 1, 'sin_coccion', 'kefir 200, platano 60', ['Tritura el kéfir con el plátano o sírvelo aparte.']],
  ['tortitas-pavo-tomate', 'Tortitas de arroz con pavo y tomate', 'mm,mer', 3, 'f', 1, 'sin_coccion', 'tortitas_arroz 20, pavo_fiambre 40, tomate 50', ['Coloca el tomate en rodajas sobre las tortitas.', 'Cubre con el pavo.']],
  ['mini-bocadillo-serrano', 'Mini bocadillo de jamón serrano con tomate', 'mm,mer', 3, 'f', 1, 'tradicional', 'pan 40, jamon_serrano 20, tomate 30', ['Abre el pan, frota el tomate y rellena con el jamón.']],
  ['crudites-tzatziki', 'Crudités con tzatziki casero', 'mm,mer', 8, 'f', 1, 'sin_coccion', 'pepino 80, zanahoria 80, yogur 80, ajo 2, aceite 3',
    ['Ralla un trozo de pepino, escúrrelo y mézclalo con el yogur, el ajo y el aceite.', 'Corta el resto del pepino y la zanahoria en bastones.']],
  ['huevo-mandarina', 'Huevo cocido y mandarina', 'mm', 10, 'f', 1, '', 'huevo 55, mandarina 80', ['Cuece el huevo 10 minutos y enfríalo.', 'Acompáñalo con la mandarina.']],
  ['skyr-frambuesas', 'Skyr con frambuesas', 'mm,mer', 2, 'f', 1, 'sin_coccion', 'skyr 150, frambuesas 60', ['Sirve el skyr con las frambuesas por encima.']],
  ['edamame-sesamo', 'Edamame salteado con sésamo', 'mm,mer', 8, 'f', 1, 'internacional', 'edamame 100, sesamo 3, salsa_soja 5', ['Cuece el edamame 4 minutos.', 'Saltéalo 1 minuto con la soja y el sésamo.']],
  ['melocoton-almendras', 'Melocotón y almendras', 'mm,mer', 1, 'f', 1, 'sin_coccion', 'melocoton 150, almendras 15', ['Lava el melocotón y acompáñalo con las almendras.']],
  ['uvas-queso-curado', 'Uvas con queso curado', 'mm,mer', 2, 'f', 1, 'sin_coccion', 'uvas 100, queso_curado 15', ['Sirve las uvas con el queso en taquitos.']],
  ['tostada-centeno-aguacate', 'Tostada de centeno con aguacate y limón', 'mm', 4, 'f', 1, '', 'pan_centeno 30, aguacate 35, limon 3', ['Tuesta el pan.', 'Unta el aguacate machacado con limón y sal.']],
  ['batido-fresa-kefir', 'Batido de fresa y kéfir', 'mm,mer', 3, 'f', 1, 'sin_coccion', 'kefir 150, fresas 100', ['Tritura el kéfir con las fresas.']],
  ['requeson-miel-nueces', 'Requesón con miel y nueces', 'mm,mer', 2, 'f', 1, 'sin_coccion', 'requeson 100, miel 5, nueces 8', ['Sirve el requesón con la miel y las nueces troceadas.']],
  ['barritas-avena-datiles', 'Barritas caseras de avena y dátiles', 'mm,mer', 30, 'm', 8, 'horno batch dulce', 'avena 25, datiles 10, crema_cacahuete 5, chia 3',
    ['Tritura los dátiles con la crema de cacahuete y un poco de agua.', 'Mezcla con la avena y la chía.', 'Extiende en una bandeja y hornea a 170 °C 18 minutos.', 'Deja enfriar y corta en 8 barritas.']],
  ['yogur-pina-coco', 'Yogur griego con piña y coco', 'mm,mer', 3, 'f', 1, 'sin_coccion', 'yogur_griego 120, pina 100, coco_rallado 4', ['Corta la piña en dados y sírvela sobre el yogur con el coco.']],
  ['sandia-feta', 'Sandía con queso feta y menta', 'mm,mer', 4, 'f', 1, 'sin_coccion', 'sandia 200, feta 20', ['Corta la sandía en dados.', 'Desmenuza el feta por encima y añade hojas de menta.']],
  ['cerezas-requeson', 'Cerezas con requesón', 'mm,mer', 2, 'f', 1, 'sin_coccion', 'cerezas 120, requeson 60', ['Lava las cerezas y sírvelas con el requesón.']],
  ['garbanzos-tostados', 'Garbanzos tostados especiados', 'mm,mer', 35, 'f', 4, 'horno batch', 'garbanzos 60, aceite 3',
    ['Seca bien los garbanzos cocidos.', 'Mézclalos con el aceite, pimentón y comino.', 'Hornea a 200 °C 30 minutos removiendo a mitad.']],
  ['hummus-remolacha', 'Hummus de remolacha con tortitas', 'mm,mer', 8, 'f', 2, '', 'remolacha 40, garbanzos 40, tahini 5, limon 5, tortitas_arroz 15', ['Tritura la remolacha, los garbanzos, el tahini y el limón con sal.', 'Sirve con las tortitas de arroz.']],
  ['pita-queso-batido-pepino', 'Pan de pita con queso batido y pepino', 'mm,mer', 4, 'f', 1, '', 'pan_pita 30, queso_batido 60, pepino 50', ['Tuesta la pita.', 'Unta el queso batido con pimienta y añade el pepino en láminas.']],
  ['higos-serrano', 'Higos con jamón serrano', 'mm,mer', 3, 'f', 1, 'sin_coccion tradicional', 'higos 100, jamon_serrano 15', ['Abre los higos y envuélvelos con el jamón.']],
];

// ---------------- Meriendas ----------------
const meriendas: Row[] = [
  ['tostada-requeson-fresas', 'Tostada de centeno con requesón y fresas', 'mer,des', 4, 'f', 1, 'dulce', 'pan_centeno 40, requeson 60, fresas 80', ['Tuesta el pan.', 'Unta el requesón y cubre con las fresas laminadas.']],
  ['bocadillito-lomo-tomate', 'Bocadillito de lomo y tomate', 'mer', 8, 'f', 1, 'tradicional', 'pan 50, lomo_cerdo 40, tomate 30, aceite 3', ['Haz el lomo a la plancha con el aceite.', 'Rellena el pan con tomate rallado y el lomo.']],
  ['yogur-muesli-pera', 'Yogur con muesli y pera', 'mer,mm', 3, 'f', 1, 'sin_coccion', 'yogur 125, muesli 25, pera 80', ['Trocea la pera y sírvela con el yogur y el muesli.']],
  ['batido-mango-kefir', 'Batido de mango y kéfir', 'mer,mm', 3, 'f', 1, 'sin_coccion', 'kefir 200, mango 100', ['Tritura el kéfir con el mango.']],
  ['sandwich-cacahuete-manzana', 'Sándwich de crema de cacahuete y manzana', 'mer', 4, 'f', 1, 'dulce', 'pan_integral 45, crema_cacahuete 12, manzana 80', ['Unta el pan con la crema de cacahuete.', 'Añade la manzana en láminas finas y cierra.']],
  ['tortitas-chocolate-platano', 'Tortitas de arroz con chocolate negro y plátano', 'mer', 4, 'f', 1, 'dulce', 'tortitas_arroz 20, chocolate 10, platano 80', ['Funde el chocolate 20 segundos en el microondas.', 'Úntalo en las tortitas y añade el plátano.']],
  ['pita-atun-tomate', 'Pan de pita con atún y tomate', 'mer,mm', 4, 'f', 1, 'sin_coccion', 'pan_pita 40, atun 40, tomate 40, aceite 3', ['Abre la pita y rellénala con el atún, el tomate y el aceite.']],
  ['queso-batido-melocoton', 'Queso batido con melocotón y canela', 'mer,mm', 3, 'f', 1, 'sin_coccion', 'queso_batido 150, melocoton 120, canela 1', ['Trocea el melocotón y mézclalo con el queso batido y la canela.']],
  ['rollitos-pavo-queso', 'Rollitos de pavo, queso fresco y pepino', 'mer,mm', 5, 'f', 1, 'sin_coccion', 'pavo_fiambre 50, queso_fresco 30, pepino 60', ['Corta el queso y el pepino en bastones.', 'Envuélvelos con las lonchas de pavo.']],
  ['smoothie-frutos-rojos-avena', 'Smoothie de frutos rojos y avena', 'mer,des', 4, 'f', 1, 'sin_coccion', 'leche 200, frutos_rojos 80, frambuesas 50, avena 15', ['Tritura todos los ingredientes hasta que quede cremoso.']],
  ['cacao-tostada-aceite', 'Leche con cacao y tostada con aceite', 'mer,des', 4, 'f', 1, 'tradicional', 'leche 200, cacao 6, pan_integral 30, aceite 3', ['Calienta la leche y disuelve el cacao.', 'Tuesta el pan y riégalo con el aceite.']],
  ['manzana-asada-yogur', 'Manzana asada con yogur y canela', 'mer', 30, 'f', 1, 'horno dulce', 'manzana 180, yogur 80, canela 1, nueces 6', ['Descorazona la manzana y hornéala con canela a 190 °C 25 minutos.', 'Sirve templada con el yogur y las nueces.']],
  ['mini-pizza-pita', 'Mini pizza de pita con tomate y mozzarella', 'mer', 12, 'f', 1, 'horno', 'pan_pita 40, tomate_triturado 30, mozzarella 30', ['Cubre la pita con el tomate, orégano y la mozzarella.', 'Hornea a 220 °C 7 minutos.']],
  ['tosta-salmon-queso-batido', 'Tosta de centeno con salmón ahumado y queso batido', 'mer,mm', 4, 'f', 1, 'sin_coccion', 'pan_centeno 40, salmon_ahumado 30, queso_batido 40', ['Unta el queso batido sobre el pan.', 'Añade el salmón y pimienta.']],
  ['nachos-guacamole', 'Nachos caseros de maíz con guacamole', 'mer', 15, 'f', 1, 'horno internacional', 'tortilla_maiz 40, aguacate 50, tomate 40, cebolla_morada 10, limon 5',
    ['Corta las tortillas en triángulos y hornéalas a 200 °C 8 minutos.', 'Machaca el aguacate con el limón, el tomate y la cebolla picados.']],
  ['galletas-avena-platano', 'Galletas de avena, plátano y pasas', 'mer,mm', 25, 'f', 6, 'horno batch dulce', 'avena 25, platano 30, pasas 5, canela 1',
    ['Machaca el plátano y mézclalo con la avena, las pasas y la canela.', 'Forma 12 galletas en una bandeja.', 'Hornea a 180 °C 15 minutos.']],
  ['yogur-soja-granola', 'Yogur de soja con granola y frambuesas', 'mer,des', 2, 'f', 1, 'sin_coccion', 'yogur_soja 125, granola 20, frambuesas 60', ['Sirve el yogur con la granola y las frambuesas.']],
  ['bocadillo-tortilla-espinacas', 'Bocadillito de tortilla de espinacas', 'mer', 8, 'f', 1, '', 'pan 50, huevo 55, espinacas 30, aceite 3', ['Saltea las espinacas con el aceite, añade el huevo batido y cuaja.', 'Rellena el pan.']],
  ['platano-griego-cacao', 'Yogur griego con plátano y cacao', 'mer', 3, 'f', 1, 'sin_coccion dulce', 'yogur_griego 120, platano 80, cacao 4', ['Mezcla el yogur con el cacao.', 'Añade el plátano en rodajas.']],
];

// ---------------- Snacks saludables ----------------
const snacks: Row[] = [
  ['mix-frutos-secos', 'Mix de frutos secos naturales', 'mm,mer', 1, 'f', 1, 'sin_coccion', 'almendras 10, nueces 10, avellanas 8', ['Mezcla un puñado de frutos secos sin sal ni tostar en aceite.']],
  ['aceitunas-cherry', 'Aceitunas con tomates cherry', 'mm,mer', 2, 'f', 1, 'sin_coccion', 'aceitunas 40, tomate_cherry 120', ['Sirve las aceitunas con los tomates cherry.']],
  ['chips-manzana', 'Chips de manzana al horno', 'mm,mer', 60, 'm', 1, 'horno dulce', 'manzana 150, canela 1', ['Corta la manzana en láminas muy finas.', 'Espolvorea canela y hornea a 120 °C 50 minutos dándoles la vuelta a mitad.']],
  ['bolitas-datil-cacao', 'Bolitas energéticas de dátil y cacao', 'mm,mer', 15, 'f', 10, 'sin_coccion batch dulce', 'datiles 12, almendras 8, cacao 2, coco_rallado 2',
    ['Tritura los dátiles deshuesados con las almendras y el cacao.', 'Forma 20 bolitas y rebózalas en coco. Una ración son 2 bolitas.']],
  ['queso-curado-nueces', 'Queso curado con nueces', 'mm,mer', 1, 'f', 1, 'sin_coccion', 'queso_curado 20, nueces 10', ['Sirve el queso en taquitos con las nueces.']],
  ['crudites-tahini', 'Zanahoria y pepino con salsa de yogur y tahini', 'mm,mer', 5, 'f', 1, 'sin_coccion', 'zanahoria 80, pepino 80, yogur 50, tahini 5', ['Mezcla el yogur con el tahini, limón y sal.', 'Corta las verduras en bastones.']],
  ['huevo-cherry', 'Huevo cocido con tomates cherry', 'mm', 10, 'f', 1, '', 'huevo 55, tomate_cherry 80', ['Cuece el huevo 10 minutos.', 'Sírvelo con los cherry y una pizca de sal y pimentón.']],
  ['melon-serrano', 'Melón con jamón serrano', 'mm,mer', 3, 'f', 1, 'sin_coccion tradicional', 'melon 150, jamon_serrano 20', ['Corta el melón en tiras y envuélvelas con el jamón.']],
  ['tortitas-queso-tomate', 'Tortitas de arroz con queso fresco y tomate', 'mm,mer', 3, 'f', 1, 'sin_coccion', 'tortitas_arroz 20, queso_fresco 30, tomate 40', ['Coloca el queso y el tomate en rodajas sobre las tortitas con orégano.']],
  ['crackers-semillas', 'Crackers de semillas caseros', 'mm,mer', 50, 'm', 8, 'horno batch', 'lino 8, sesamo 6, pipas_girasol 6, chia 4, avena 10',
    ['Mezcla las semillas y la avena con agua (el doble de volumen) y sal; reposa 15 minutos.', 'Extiende muy fino sobre papel de horno.', 'Hornea a 160 °C 35 minutos y rompe en trozos.']],
  ['pera-crema-almendras', 'Pera con crema de almendras', 'mm,mer', 2, 'f', 1, 'sin_coccion', 'pera 150, crema_almendras 10', ['Corta la pera en gajos y úntalos con la crema de almendras.']],
  ['fresas-chocolate', 'Fresas con chocolate negro', 'mer', 8, 'f', 1, 'dulce', 'fresas 150, chocolate 10', ['Funde el chocolate.', 'Baña las fresas a medias y deja que se endurezca en la nevera.']],
  ['brochetas-caprese', 'Brochetas caprese', 'mm,mer', 5, 'f', 1, 'sin_coccion internacional', 'mozzarella 40, tomate_cherry 100, aceite 3', ['Ensarta los cherry y las bolitas de mozzarella.', 'Aliña con el aceite, sal y albahaca.']],
];

// ---------------- Postres y opciones dulces ----------------
const postres: Row[] = [
  ['natillas-ligeras', 'Natillas caseras ligeras', 'mer', 20, 'm', 4, 'dulce', 'leche 150, huevo 25, harina 6, miel 8, canela 1',
    ['Calienta la leche con la canela y la piel de limón.', 'Bate el huevo con la harina y la miel y añade la leche poco a poco.', 'Cuece a fuego suave sin dejar de remover hasta que espese.', 'Reparte en 4 cuencos y enfría.']],
  ['arroz-con-leche', 'Arroz con leche ligero', 'mer', 45, 'e', 4, 'tradicional dulce', 'arroz 20, leche 180, miel 8, canela 1, limon 2',
    ['Cuece el arroz en la leche con la canela en rama y la piel de limón a fuego muy suave 40 minutos, removiendo.', 'Endulza con la miel al final y sirve con canela molida.']],
  ['flan-huevo-ligero', 'Flan de huevo ligero al horno', 'mer', 50, 'e', 4, 'horno dulce', 'leche 120, huevo 55, miel 8',
    ['Bate los huevos con la leche y la miel.', 'Reparte en flaneras y hornea al baño maría a 170 °C 40 minutos.', 'Enfría al menos 2 horas.']],
  ['mousse-chocolate-yogur', 'Mousse de chocolate y yogur griego', 'mer', 10, 'f', 4, 'sin_coccion dulce', 'yogur_griego 120, chocolate 15, cacao 3, miel 5',
    ['Funde el chocolate y mézclalo con el cacao y la miel.', 'Incorpora el yogur con movimientos envolventes.', 'Enfría 1 hora antes de servir.']],
  ['helado-platano-cacao', 'Helado de plátano y cacao', 'mer', 5, 'f', 1, 'sin_coccion dulce', 'platano 120, cacao 5, leche 30',
    ['Congela el plátano en rodajas al menos 4 horas.', 'Tritúralo con el cacao y la leche hasta obtener una textura cremosa.']],
  ['sorbete-mango', 'Sorbete de mango y yogur', 'mer', 5, 'f', 1, 'sin_coccion dulce', 'mango 150, limon 10, yogur 40', ['Congela el mango en dados.', 'Tritúralo con el limón y el yogur y sirve al momento.']],
  ['bizcocho-yogur-limon', 'Bizcocho integral de yogur y limón', 'mer,des', 50, 'e', 10, 'horno batch dulce', 'harina_integral 25, yogur 25, huevo 15, aceite 6, miel 8, limon 3, levadura_quimica 1',
    ['Precalienta el horno a 180 °C.', 'Bate los huevos con la miel, el yogur, el aceite y la ralladura de limón.', 'Añade la harina con la levadura tamizada.', 'Hornea en molde 35 minutos.']],
  ['brownie-boniato', 'Brownie de boniato y cacao', 'mer', 45, 'e', 8, 'horno batch dulce', 'boniato 50, huevo 15, cacao 6, almendras 8, miel 8, chocolate 6',
    ['Asa o cuece el boniato y haz un puré.', 'Mezcla con los huevos, la miel, el cacao, las almendras molidas y el chocolate troceado.', 'Hornea en molde cuadrado a 180 °C 25 minutos.']],
  ['tarta-queso-ligera', 'Tarta de queso ligera al horno', 'mer', 60, 'e', 8, 'horno dulce', 'queso_batido 80, requeson 40, huevo 20, harina 5, miel 10, limon 3',
    ['Precalienta el horno a 170 °C.', 'Bate el queso batido, el requesón, los huevos, la miel, la harina y la ralladura de limón.', 'Vierte en un molde forrado y hornea 45 minutos.', 'Enfría en la nevera varias horas.']],
  ['peras-asadas-canela', 'Peras asadas con canela y nueces', 'mer', 30, 'f', 1, 'horno dulce', 'pera 170, canela 1, nueces 8, miel 5', ['Parte la pera por la mitad y espolvorea canela.', 'Hornea a 190 °C 25 minutos.', 'Sirve con las nueces y la miel.']],
  ['macedonia-temporada', 'Macedonia de frutas de temporada', 'mer,mm', 8, 'f', 1, 'sin_coccion dulce', 'naranja 80, kiwi 60, fresas 60, platano 60, granada 20', ['Trocea la fruta.', 'Mezcla con el zumo de parte de la naranja y la granada.']],
  ['crema-yogur-frambuesas', 'Crema de yogur con frambuesas y pistachos', 'mer', 4, 'f', 1, 'sin_coccion dulce', 'yogur_griego 120, frambuesas 60, pistachos 8, miel 4', ['Aplasta la mitad de las frambuesas con la miel.', 'Alterna capas con el yogur y termina con las frambuesas y los pistachos.']],
  ['tarta-manzana-fina', 'Tarta fina de manzana', 'mer', 50, 'e', 6, 'horno dulce', 'harina 25, aceite 6, manzana 100, canela 1, miel 6',
    ['Mezcla la harina, el aceite, una pizca de sal y agua fría hasta tener una masa; estírala fina.', 'Cubre con la manzana en láminas finas y la canela.', 'Hornea a 200 °C 30 minutos y pinta con la miel.']],
  ['torrijas-horno', 'Torrijas al horno ligeras', 'mer', 35, 'm', 4, 'tradicional horno dulce', 'pan 50, leche 80, huevo 20, canela 1, miel 8',
    ['Calienta la leche con canela y limón y empapa las rebanadas de pan.', 'Pásalas por huevo batido.', 'Hornea a 200 °C 15 minutos dándoles la vuelta.', 'Pinta con la miel.']],
  ['pudin-chia-cacao', 'Pudin de chía y cacao con frambuesas', 'mer,des', 5, 'f', 1, 'sin_coccion batch dulce', 'chia 18, leche 150, cacao 5, miel 5, frambuesas 40', ['Mezcla la chía con la leche, el cacao y la miel.', 'Deja en la nevera 4 horas y sirve con las frambuesas.']],
  ['crepes-chocolate-platano', 'Crepes con chocolate y plátano', 'mer', 20, 'm', 1, 'dulce', 'harina 25, huevo 25, leche 60, chocolate 10, platano 60, aceite 2',
    ['Bate la harina, el huevo y la leche.', 'Haz los crepes en sartén engrasada.', 'Rellena con el chocolate fundido y el plátano.']],
  ['higos-asados-requeson', 'Higos asados con requesón y miel', 'mer', 15, 'f', 1, 'horno dulce', 'higos 120, requeson 60, miel 5', ['Abre los higos en cruz y hornéalos a 200 °C 10 minutos.', 'Sirve con el requesón y la miel.']],
];

export const MEDIA_MANANA = rows('mediamanana', mediaManana);
export const MERIENDAS = rows('merienda', meriendas);
export const SNACKS = rows('snack', snacks);
export const POSTRES = rows('postre', postres);
