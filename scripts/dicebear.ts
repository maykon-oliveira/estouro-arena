// Utilidades dos geradores de arte com o DiceBear 10 (núcleo JavaScript), usados só no
// desenvolvimento: `bun run tiles` e `bun run avatars`. O jogo nunca chama o DiceBear.
import { Avatar, Style } from '@dicebear/core';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const THEME = 'assets/themes/default';

/** Lê um JSON do tema (fonte de um gerador). */
export function readThemeJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(THEME, file), 'utf8')) as T;
}

/** Gera um SVG; recusa estilo fora da lista CC0 da fonte. */
export function renderSvg(
  style: string,
  cc0Styles: readonly string[],
  options: Record<string, unknown>,
  label: string,
): string {
  if (!cc0Styles.includes(style)) {
    throw new Error(`${label}: estilo ${style} fora da lista CC0 permitida`);
  }
  const definition = JSON.parse(
    readFileSync(`node_modules/@dicebear/styles/dist/${style}.min.json`, 'utf8'),
  ) as ConstructorParameters<typeof Style>[0];
  return (
    new Avatar(new Style(definition), options)
      .toString()
      // Sem o bloco <metadata> (tem aspas curvas, fora do Latin-1, e só repete a licença CC0,
      // que não exige atribuição; os créditos ficam em CREDITS.md).
      .replace(/<metadata[\s\S]*?<\/metadata>/, '') + '\n'
  );
}

/** Escreve um arquivo do tema (caminho relativo ao tema). */
export function writeThemeFile(file: string, content: string): void {
  writeFileSync(join(THEME, file), content);
}

/** Atualiza entradas do manifest.json do tema (o resto fica como está), em ordem alfabética. */
export function updateManifest(entries: Record<string, { files: string[]; source: string }>): void {
  const manifestPath = join(THEME, 'manifest.json');
  const manifest = (
    existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}
  ) as Record<string, unknown>;
  Object.assign(manifest, entries);
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + '\n');
}
