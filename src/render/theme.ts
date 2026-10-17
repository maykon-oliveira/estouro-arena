// Tema de arte: resolve nomes lógicos (`tile.agua_rasa`) para texturas, pelo manifest do tema.
// O jogo nunca usa caminhos de arquivo (CLAUDE.md, regra 4); só este módulo conhece o tema.
import manifestJson from '../../assets/themes/default/manifest.json';
import { parseContent, ThemeManifestSchema } from '../data/schemas';

const THEME_DIR = '../../assets/themes/default/';

/** URL final (com hash do Vite) de cada arquivo do tema, pelo caminho relativo ao tema. */
const fileUrls = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../assets/themes/default/**/*.{svg,png}', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  ).map(([path, url]) => [path.slice(THEME_DIR.length), url]),
);

export const themeManifest = parseContent(
  ThemeManifestSchema,
  manifestJson,
  'assets/themes/default/manifest.json',
);

/** Uma textura do tema: chave no cache do Phaser e URL do arquivo. */
export interface ThemeTexture {
  key: string;
  url: string;
}

/** Texturas (variações) de um nome lógico; vazio se o tema não tiver. */
export function themeTextures(name: string): ThemeTexture[] {
  const entry = themeManifest[name];
  if (!entry) return [];
  return entry.files.map((file, n) => {
    const url = fileUrls[file];
    if (!url) throw new Error(`assets/themes/default/manifest.json: ${name} → ${file} não existe`);
    return { key: `${name}.${n}`, url };
  });
}

/** Variação fixa por posição (o mapa não "pisca" ao redesenhar), em [0, n). */
export function tileVariant(x: number, y: number, n: number): number {
  if (n <= 1) return 0;
  const h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663);
  return (h >>> 0) % n;
}
