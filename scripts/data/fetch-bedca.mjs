/**
 * Descarga la composición de todos los alimentos de BEDCA (Base de Datos Española de
 * Composición de Alimentos, AESAN) mediante su servicio de consultas XML.
 * Uso: node scripts/data/fetch-bedca.mjs <carpeta-salida>
 * Guarda un JSON por alimento con los componentes que usa la app (por 100 g de porción comestible).
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2];
if (!OUT) throw new Error('Indica la carpeta de salida');
mkdirSync(OUT, { recursive: true });
const URL = 'https://www.bedca.net/bdpub/procquery.php';
const post = async (xml) => {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: xml });
      if (r.ok) return await r.text();
    } catch {}
    await new Promise((s) => setTimeout(s, 2000 * (i + 1)));
  }
  throw new Error('BEDCA no responde');
};
const tag = (s, t) => (s.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)) ?? [])[1] ?? '';

const listXml = `<?xml version="1.0" encoding="utf-8"?><foodquery><type level="1"/><selection><atribute name="f_id"/><atribute name="f_ori_name"/><atribute name="f_eng_name"/><atribute name="f_origen"/></selection><condition><cond1><atribute1 name="f_origen"/></cond1><relation type="EQUAL"/><cond3>BEDCA</cond3></condition><order ordtype="ASC"><atribute3 name="f_ori_name"/></order></foodquery>`;
const list = [...(await post(listXml)).matchAll(/<food>([\s\S]*?)<\/food>/g)].map((m) => ({ id: tag(m[1], 'f_id'), name: tag(m[1], 'f_ori_name'), en: tag(m[1], 'f_eng_name') }));
writeFileSync(join(OUT, '_list.json'), JSON.stringify(list));
console.log(`${list.length} alimentos`);

const detail = (id) => `<?xml version="1.0" encoding="utf-8"?><foodquery><type level="2"/><selection><atribute name="f_id"/><atribute name="f_ori_name"/><atribute name="edible_portion"/><atribute name="c_id"/><atribute name="c_ori_name"/><atribute name="best_location"/><atribute name="v_unit"/></selection><condition><cond1><atribute1 name="f_id"/></cond1><relation type="EQUAL"/><cond3>${id}</cond3></condition><order ordtype="ASC"><atribute3 name="componentgroup_id"/></order></foodquery>`;
let done = 0;
for (const f of list) {
  const file = join(OUT, `${f.id}.json`);
  if (existsSync(file)) { done++; continue; }
  const xml = await post(detail(f.id));
  const values = {};
  for (const m of xml.matchAll(/<foodvalue>([\s\S]*?)<\/foodvalue>/g)) {
    const v = tag(m[1], 'best_location');
    values[tag(m[1], 'c_id')] = { name: tag(m[1], 'c_ori_name'), value: v === '' ? null : Number(v), unit: tag(m[1], 'v_unit') };
  }
  writeFileSync(file, JSON.stringify({ ...f, edible: Number(tag(xml, 'edible_portion')) || null, values }));
  done++;
  if (done % 50 === 0) console.log(`${done}/${list.length}`);
  await new Promise((s) => setTimeout(s, 250));
}
console.log('BEDCA completo', done);
