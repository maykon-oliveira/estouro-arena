import { describe, expect, it } from 'vitest';
import { generateGrid, inBounds, setTile, tileAt, type MapDefinition } from '../../src/core/grid';
import { createRng } from '../../src/core/rng';
import { BLOCK, FLOOR, WALL } from '../../src/core/terrainIds';

const legend = { '#': 'parede', '.': 'chao', '~': 'agua_rasa', P: 'spawn' };

function makeMap(mapa: string[], densidade: number): MapDefinition {
  return {
    tamanho: [mapa[0]?.length ?? 0, mapa.length],
    legenda: legend,
    mapa,
    blocos: { densidade },
  };
}

const classic = makeMap(
  ['#########', '#P.....P#', '#.#.#.#.#', '#.......#', '#.#.#.#.#', '#P.....P#', '#########'],
  1,
);

describe('generateGrid', () => {
  it('lê dimensões e terrenos fixos do mapa', () => {
    const grid = generateGrid(classic, createRng(1), 1);
    expect(grid.cols).toBe(9);
    expect(grid.rows).toBe(7);
    expect(tileAt(grid, 0, 0)).toBe(WALL);
    expect(tileAt(grid, 2, 2)).toBe(WALL);
  });

  it('extrai os spawns e deixa chão neles', () => {
    const grid = generateGrid(classic, createRng(1), 1);
    expect(grid.spawns).toEqual([
      { x: 1, y: 1 },
      { x: 7, y: 1 },
      { x: 1, y: 5 },
      { x: 7, y: 5 },
    ]);
    for (const s of grid.spawns) expect(tileAt(grid, s.x, s.y)).toBe(FLOOR);
  });

  it('mantém livre a área segura em volta dos spawns', () => {
    const grid = generateGrid(classic, createRng(1), 1);
    for (const s of grid.spawns) {
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        expect(tileAt(grid, s.x + dx, s.y + dy)).not.toBe(BLOCK);
      }
    }
  });

  it('com densidade 1 enche todo chão elegível de blocos', () => {
    const grid = generateGrid(classic, createRng(1), 1);
    expect(tileAt(grid, 4, 1)).toBe(BLOCK);
    expect(tileAt(grid, 4, 3)).toBe(BLOCK);
  });

  it('com densidade 0 não coloca blocos', () => {
    const grid = generateGrid({ ...classic, blocos: { densidade: 0 } }, createRng(1), 1);
    expect(grid.tiles).not.toContain(BLOCK);
  });

  it('só coloca blocos sobre chão', () => {
    const map = makeMap(['#####', '#P~~#', '#~~~#', '#####'], 1);
    const grid = generateGrid(map, createRng(1), 0);
    expect(grid.tiles.filter((t) => t === 'agua_rasa')).toHaveLength(5);
    expect(grid.tiles).not.toContain(BLOCK);
  });

  it('é determinístico para a mesma seed', () => {
    const half = { ...classic, blocos: { densidade: 0.5 } };
    const a = generateGrid(half, createRng(42), 1);
    const b = generateGrid(half, createRng(42), 1);
    expect(a.tiles).toEqual(b.tiles);
  });

  it('seeds diferentes geram distribuições diferentes', () => {
    const open = makeMap(['P' + '.'.repeat(29)], 0.5);
    const a = generateGrid(open, createRng(1), 0);
    const b = generateGrid(open, createRng(2), 0);
    expect(a.tiles).not.toEqual(b.tiles);
  });
});

describe('helpers da grade', () => {
  const grid = generateGrid(classic, createRng(1), 1);

  it('inBounds', () => {
    expect(inBounds(grid, 0, 0)).toBe(true);
    expect(inBounds(grid, 8, 6)).toBe(true);
    expect(inBounds(grid, -1, 0)).toBe(false);
    expect(inBounds(grid, 9, 0)).toBe(false);
    expect(inBounds(grid, 0, 7)).toBe(false);
  });

  it('tileAt fora da grade devolve undefined', () => {
    expect(tileAt(grid, 99, 99)).toBeUndefined();
  });

  it('setTile altera o tile', () => {
    const g = generateGrid(classic, createRng(1), 1);
    setTile(g, 4, 1, FLOOR);
    expect(tileAt(g, 4, 1)).toBe(FLOOR);
  });
});
