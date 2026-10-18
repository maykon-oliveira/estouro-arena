// Gera as texturas de terreno do tema padrão com o DiceBear 10 (núcleo JavaScript).
// Uso: bun run tiles. Lê assets/themes/default/tiles.dicebear.json, escreve os SVGs em
// assets/themes/default/tiles/ e atualiza as entradas `tile.*` do manifest.json do tema.
import { readThemeJson, renderSvg, THEME, updateManifest, writeThemeFile } from './dicebear';

interface TileSource {
  style: string;
  options: Record<string, unknown>;
}
interface Source {
  size: number;
  variants: number;
  cc0Styles: string[];
  tiles: Record<string, TileSource>;
}

const source = readThemeJson<Source>('tiles.dicebear.json');
const entries: Record<string, { files: string[]; source: string }> = {};

for (const [terrain, { style, options }] of Object.entries(source.tiles)) {
  const files: string[] = [];
  for (let n = 0; n < source.variants; n++) {
    const svg = renderSvg(
      style,
      source.cc0Styles,
      { ...options, seed: `${terrain}-${n}`, size: source.size },
      terrain,
    );
    const file = `tiles/${terrain}_${n}.svg`;
    writeThemeFile(file, svg);
    files.push(file);
  }
  entries[`tile.${terrain}`] = { files, source: `dicebear:${style}` };
}

updateManifest(entries);
console.log(
  `${Object.keys(source.tiles).length} terrenos × ${source.variants} variações em ${THEME}/tiles`,
);
