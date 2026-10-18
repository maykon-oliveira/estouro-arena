// Gera os avatares dos personagens do tema padrão com o DiceBear 10 (núcleo JavaScript).
// Uso: bun run avatars. Lê assets/themes/default/avatars.dicebear.json, escreve em
// assets/themes/default/avatars/ o retrato (`<id>.svg`, menus e HUD) e a ficha da arena
// (`<id>_token.svg`, em círculo) e atualiza as entradas `avatar.*` e `player.*` do manifest.
import { readThemeJson, renderSvg, THEME, updateManifest, writeThemeFile } from './dicebear';

interface Source {
  size: number;
  cc0Styles: string[];
  style: string;
  /** Opções extras da ficha da arena (ex.: `borderRadius` 50 = círculo). */
  token: Record<string, unknown>;
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

  const token = renderSvg(
    source.style,
    source.cc0Styles,
    { ...options, ...source.token, seed: character, size: source.size },
    character,
  );
  const tokenFile = `avatars/${character}_token.svg`;
  writeThemeFile(tokenFile, token);
  entries[`player.${character}`] = { files: [tokenFile], source: `dicebear:${source.style}` };
}

updateManifest(entries);
console.log(`${Object.keys(source.avatars).length} avatares em ${THEME}/avatars`);
