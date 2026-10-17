import type { Rng } from './rng';
import { BLOCK, FLOOR, SPAWN } from './terrainIds';

/** Formato de fase do GDD §4 (só o que a geração da grade usa). */
export interface MapDefinition {
  tamanho: readonly [number, number];
  legenda: Readonly<Record<string, string>>;
  mapa: readonly string[];
  blocos: { densidade: number };
}

export interface Point {
  x: number;
  y: number;
}

export interface Grid {
  cols: number;
  rows: number;
  /** Id de terreno por tile, linha a linha (índice = y * cols + x). */
  tiles: string[];
  spawns: Point[];
}

export function inBounds(grid: Grid, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < grid.cols && y < grid.rows;
}

export function tileAt(grid: Grid, x: number, y: number): string | undefined {
  return inBounds(grid, x, y) ? grid.tiles[y * grid.cols + x] : undefined;
}

export function setTile(grid: Grid, x: number, y: number, terrainId: string): void {
  if (inBounds(grid, x, y)) grid.tiles[y * grid.cols + x] = terrainId;
}

/**
 * Monta a grade a partir do mapa: terrenos fixos do ASCII e blocos quebráveis sorteados
 * sobre o chão, com a densidade do mapa, poupando a área segura em volta de cada spawn.
 * Supõe um mapa já validado pelo schema.
 */
export function generateGrid(map: MapDefinition, rng: Rng, spawnSafeRadius: number): Grid {
  const [cols, rows] = map.tamanho;
  const tiles: string[] = [];
  const spawns: Point[] = [];

  for (let y = 0; y < rows; y++) {
    const line = map.mapa[y] ?? '';
    for (let x = 0; x < cols; x++) {
      const id = map.legenda[line[x] ?? ''] ?? FLOOR;
      if (id === SPAWN) {
        spawns.push({ x, y });
        tiles.push(FLOOR);
      } else {
        tiles.push(id);
      }
    }
  }

  const isSafe = (x: number, y: number): boolean =>
    spawns.some((s) => Math.abs(s.x - x) + Math.abs(s.y - y) <= spawnSafeRadius);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (tiles[i] !== FLOOR || isSafe(x, y)) continue;
      // Sorteia sempre que o tile é elegível, para a sequência do RNG não depender da densidade.
      if (rng.next() < map.blocos.densidade) tiles[i] = BLOCK;
    }
  }

  return { cols, rows, tiles, spawns };
}
