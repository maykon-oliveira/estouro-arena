// Gera as texturas de terreno do tema padrão com o DiceBear 10 (núcleo JavaScript).
// Uso: bun run tiles. Lê assets/themes/default/tiles.dicebear.json, escreve os SVGs em
// assets/themes/default/tiles/ e atualiza as entradas `tile.*` do manifest.json do tema.
import { Avatar, Style } from '@dicebear/core';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

const THEME = 'assets/themes/default';
const source = JSON.parse(readFileSync(join(THEME, 'tiles.dicebear.json'), 'utf8')) as Source;
const manifestPath = join(THEME, 'manifest.json');
const manifest = (
  existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}
) as Record<string, unknown>;

for (const [terrain, { style, options }] of Object.entries(source.tiles)) {
  if (!source.cc0Styles.includes(style)) {
    throw new Error(`${terrain}: estilo ${style} fora da lista CC0 permitida`);
  }
  const definition = JSON.parse(
    readFileSync(`node_modules/@dicebear/styles/dist/${style}.min.json`, 'utf8'),
  ) as ConstructorParameters<typeof Style>[0];
  const files: string[] = [];
  for (let n = 0; n < source.variants; n++) {
    const svg = new Avatar(new Style(definition), {
      ...options,
      seed: `${terrain}-${n}`,
      size: source.size,
    })
      .toString()
      // Sem o bloco <metadata> (tem aspas curvas, fora do Latin-1, e só repete a licença CC0,
      // que não exige atribuição; os créditos ficam em CREDITS.md).
      .replace(/<metadata[\s\S]*?<\/metadata>/, '');
    const file = `tiles/${terrain}_${n}.svg`;
    writeFileSync(join(THEME, file), svg + '\n');
    files.push(file);
  }
  manifest[`tile.${terrain}`] = { files, source: `dicebear:${style}` };
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + '\n');
console.log(
  `${Object.keys(source.tiles).length} terrenos × ${source.variants} variações em ${THEME}/tiles`,
);
