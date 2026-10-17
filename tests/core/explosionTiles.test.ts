import { describe, expect, it } from 'vitest';
import { explosionTiles } from '../../src/core/bombs';
import type { Point } from '../../src/core/grid';
import { dropBomb, hold, run, worldFrom } from './helpers';

const keys = (tiles: Point[]) => tiles.map((t) => `${t.x},${t.y}`).sort();

describe('explosionTiles', () => {
  it('prevê a mesma cruz que a explosão real produz', () => {
    const world = worldFrom(['#######', '#.P.B.#', '#.....#', '#######'], 1, { fuseTicks: 30 });
    dropBomb(world);
    const bomb = world.bombs[0];
    if (!bomb) throw new Error('sem bomba');
    const preview = explosionTiles(world, bomb);

    hold(world, 'down', 10);
    hold(world, 'left', 10); // (1,2): fora da cruz
    const boom = run(world, 30).find((e) => e.type === 'bomba.explodiu');
    expect(boom?.type === 'bomba.explodiu' && keys(boom.tiles)).toEqual(keys(preview.tiles));
  });

  it('para em bloco e parede, incluindo o bloco', () => {
    const world = worldFrom(['#######', '#.P.B.#', '#######']);
    dropBomb(world);
    const bomb = world.bombs[0];
    if (!bomb) throw new Error('sem bomba');
    // Alcance 2: esquerda (1,1) e parede; direita (3,1) e bloco (4,1); cima/baixo paredes.
    expect(keys(explosionTiles(world, bomb).tiles)).toEqual(['1,1', '2,1', '3,1', '4,1']);
  });

  it('aponta a bomba atingida e para nela', () => {
    const world = worldFrom(['########', '#P.....#', '########'], 1, {
      startBombs: 2,
      startRange: 5,
      fuseTicks: 60,
    });
    dropBomb(world);
    hold(world, 'right', 20); // (3,1)
    dropBomb(world);
    const [first, second] = world.bombs;
    if (!first || !second) throw new Error('faltam bombas');
    const preview = explosionTiles(world, first);
    expect(keys(preview.tiles)).toEqual(['1,1', '2,1', '3,1']);
    expect(preview.hitBombs).toEqual([second]);
  });

  it('não altera o mundo', () => {
    const world = worldFrom(['#######', '#.P.B.#', '#######']);
    dropBomb(world);
    const bomb = world.bombs[0];
    if (!bomb) throw new Error('sem bomba');
    const before = JSON.stringify({ t: world.grid.tiles, f: world.flames, b: world.bombs });
    explosionTiles(world, bomb);
    expect(JSON.stringify({ t: world.grid.tiles, f: world.flames, b: world.bombs })).toBe(before);
  });
});
