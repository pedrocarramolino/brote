// Genera los PNG del icono de pantalla de inicio a partir de los SVG (se ejecuta antes de `vite build`).
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const dir = new URL('../public/icons/', import.meta.url);
const full = readFileSync(new URL('icon.svg', dir));
const maskable = readFileSync(new URL('icon-maskable.svg', dir));
const jobs = [
  ['apple-touch-icon.png', 180, full],
  ['icon-192.png', 192, full],
  ['icon-512.png', 512, full],
  ['icon-maskable-512.png', 512, maskable],
  ['favicon-32.png', 32, full],
];
for (const [name, size, svg] of jobs) {
  await sharp(svg, { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toFile(new URL(name, dir).pathname);
}
console.log('Iconos generados');
