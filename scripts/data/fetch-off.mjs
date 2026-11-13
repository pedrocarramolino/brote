/**
 * Descarga productos de marcas habituales en supermercados españoles desde Open Food Facts
 * (datos de etiqueta aportados por la comunidad, licencia ODbL). Respeta el límite de su API
 * de búsqueda (≤ 10 consultas/min). Uso: NODE_USE_ENV_PROXY=1 node scripts/data/fetch-off.mjs <salida.json>
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = process.argv[2];
if (!OUT) throw new Error('Indica el fichero de salida');
// [etiqueta de marca en OFF, páginas de 100 productos (por popularidad)]
const BRANDS = [
  ['hacendado', 6], ['carrefour', 4], ['milbona', 2], ['pilos', 1], ['freshona', 1], ['crownfield', 1], ['deluxe', 1], ['lidl', 1],
  ['auchan', 2], ['alcampo', 1], ['dia', 2], ['eroski', 2], ['consum', 1], ['bonarea', 1],
  ['central-lechera-asturiana', 2], ['pascual', 2], ['puleva', 1], ['kaiku', 1], ['danone', 2], ['activia', 1], ['danone-oikos', 1], ['nestle', 2], ['la-lechera', 1],
  ['president', 1], ['philadelphia', 1], ['arla', 1], ['galbani', 1], ['el-caserio', 1], ['garcia-baquero', 1], ['emmi', 1],
  ['elpozo', 2], ['campofrio', 2], ['navidul', 1], ['noel', 1], ['casa-tarradellas', 1], ['coren', 1],
  ['buitoni', 1], ['gallo', 1], ['barilla', 1], ['brillante', 1], ['sos', 1], ['la-fallera', 1],
  ['bimbo', 2], ['gullon', 1], ['kellogg-s', 1], ['quaker', 1], ['alpro', 1], ['vivesoy', 1], ['oatly', 1], ['liquats-vegetals', 1], ['ecomil', 1],
  ['calvo', 1], ['isabel', 1], ['albo', 1], ['cuca', 1], ['ybarra', 1], ['carbonell', 1], ['la-espanola', 1], ['koipe', 1],
  ['hellmann-s', 1], ['heinz', 1], ['ligeresa', 1], ['hero', 1], ['helios', 1], ['nocilla', 1], ['cola-cao', 1], ['valor', 1], ['lindt', 1],
  ['heura', 1], ['garden-gourmet', 1], ['old-el-paso', 1], ['tulipan', 1], ['flora', 1], ['findus', 1], ['pescanova', 1], ['florette', 1], ['bonduelle', 1],
  ['prozis', 1], ['myprotein', 1],
];
const FIELDS = 'code,product_name_es,product_name,brands,quantity,categories_tags,nutriments,nutrition_data_per,lang,allergens_tags';
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
const all = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const done = new Set(Object.values(all).map((p) => p._q));

for (const [brand, pages] of BRANDS) {
  for (let page = 1; page <= pages; page++) {
    const q = `${brand}#${page}`;
    if (done.has(q)) continue;
    const url = `https://world.openfoodfacts.org/api/v2/search?brands_tags=${brand}&countries_tags=en:spain&fields=${FIELDS}&page_size=100&page=${page}&sort_by=unique_scans_n`;
    let json = null;
    for (let i = 0; i < 4 && !json; i++) {
      try {
        const r = await fetch(url, { headers: { 'User-Agent': 'BroteApp/1.0 (catálogo nutricional)' } });
        if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) json = await r.json();
      } catch {}
      if (!json) await sleep(15000);
    }
    const prods = json?.products ?? [];
    for (const p of prods) all[p.code] = { ...p, _q: q, _brand: brand };
    console.log(`${q}: ${prods.length} (total ${Object.keys(all).length})`);
    writeFileSync(OUT, JSON.stringify(all));
    await sleep(6500);
    if (prods.length < 100) break;
  }
}
console.log('OFF completo', Object.keys(all).length);
