import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { terrains } from '../../src/data';
import { ThemeManifestSchema } from '../../src/data/schemas';
import { tileVariant } from '../../src/render/theme';

const THEME = 'assets/themes/default';
const manifest = ThemeManifestSchema.parse(
  JSON.parse(readFileSync(join(THEME, 'manifest.json'), 'utf8')),
);

describe('manifest do tema padrão', () => {
  it('todo terreno tem textura (tile.<id>) e os arquivos existem', () => {
    for (const id of terrains.keys()) {
      const entry = manifest[`tile.${id}`];
      expect(entry, id).toBeDefined();
      for (const file of entry?.files ?? []) expect(existsSync(join(THEME, file)), file).toBe(true);
    }
  });

  it('as texturas de terreno vêm do DiceBear, só de estilos CC0', () => {
    const source = JSON.parse(readFileSync(join(THEME, 'tiles.dicebear.json'), 'utf8')) as {
      cc0Styles: string[];
    };
    for (const id of terrains.keys()) {
      const style = manifest[`tile.${id}`]?.source?.replace('dicebear:', '') ?? '';
      expect(source.cc0Styles, id).toContain(style);
    }
  });

  it('o schema recusa nome lógico ou arquivo fora do padrão', () => {
    expect(ThemeManifestSchema.safeParse({ Tile: { files: ['a.svg'] } }).success).toBe(false);
    expect(ThemeManifestSchema.safeParse({ 'tile.chao': { files: [] } }).success).toBe(false);
    expect(ThemeManifestSchema.safeParse({ 'tile.chao': { files: ['../x.gif'] } }).success).toBe(
      false,
    );
  });
});

describe('variação por posição', () => {
  it('é determinística, fica em [0, n) e varia pela grade', () => {
    const seen = new Set<number>();
    for (let y = 0; y < 13; y++) {
      for (let x = 0; x < 15; x++) {
        const v = tileVariant(x, y, 4);
        expect(v).toBe(tileVariant(x, y, 4));
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(4);
        seen.add(v);
      }
    }
    expect(seen.size).toBe(4);
    expect(tileVariant(3, 5, 1)).toBe(0);
  });
});
