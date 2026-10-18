// Gera os avatares dos personagens do tema padrão com o DiceBear 10 (núcleo JavaScript).
// Uso: bun run avatars. Lê assets/themes/default/avatars.dicebear.json, escreve os SVGs em
// assets/themes/default/avatars/ e atualiza as entradas `avatar.*` do manifest.json do tema.
import { readThemeJson, renderSvg, THEME, updateManifest, writeThemeFile } from './dicebear';

interface Source {
  size: number;
  cc0Styles: string[];
  style: string;
  avatars: Record<string, Record<string, unknown>>;
}

const source = readThemeJson<Source>('avatars.dicebear.json');
const entries: Record<string, { files: string[]; source: string }> = {};

for (const [character, options] of Object.entries(source.avatars)) {
  const svg = renderSvg(
    source.style,
    source.cc0Styles,
    { ...options, seed: character, size: source.size },
    character,
  );
  const file = `avatars/${character}.svg`;
  writeThemeFile(file, svg);
  entries[`avatar.${character}`] = { files: [file], source: `dicebear:${source.style}` };
}

updateManifest(entries);
console.log(`${Object.keys(source.avatars).length} avatares em ${THEME}/avatars`);
