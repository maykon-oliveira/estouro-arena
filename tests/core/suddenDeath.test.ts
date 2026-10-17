import { describe, expect, it } from 'vitest';
import { computeDanger, createDangerMap, SAFE } from '../../src/core/bots/dangerMap';
import type { MapDefinition } from '../../src/core/grid';
import { createMatch, stepMatch, type Match } from '../../src/core/match';
import { advanceCollapse, spiralOrder, startCollapse } from '../../src/core/suddenDeath';
import { WALL } from '../../src/core/terrainIds';
import type { Bomb, World } from '../../src/core/world';
import type { GameEvent } from '../../src/events';
import { player, run, testItems, testMounts, testRules, testTerrains, worldFrom } from './helpers';

const idx = (world: World, x: number, y: number) => y * world.grid.cols + x;
const xy = (world: World, i: number) => `${i % world.grid.cols},${Math.floor(i / world.grid.cols)}`;

const ofType = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

describe('espiral', () => {
  it('sentido horário, do anel externo para o centro, começando no canto superior esquerdo', () => {
    const world = worldFrom(['#####', '#P..#', '#...#', '#...#', '#####']);
    expect(spiralOrder(world.grid).map((i) => xy(world, i))).toEqual([
      '1,1',
      '2,1',
      '3,1',
      '3,2',
      '3,3',
      '2,3',
      '1,3',
      '1,2',
      '2,2',
    ]);
  });

  it('pula tiles que já são parede', () => {
    const world = worldFrom(['#####', '#P..#', '#.#.#', '#...#', '#####']);
    const order = spiralOrder(world.grid).map((i) => xy(world, i));
    expect(order).not.toContain('2,2');
    expect(order).toHaveLength(8);
  });

  it('funciona em grade não quadrada (7 × 5)', () => {
    const world = worldFrom(['#######', '#P....#', '#.....#', '#.....#', '#######']);
    const order = spiralOrder(world.grid);
    expect(new Set(order).size).toBe(15);
    expect(xy(world, order[order.length - 1] ?? -1)).toBe('4,2'); // miolo 3 × 1: (2,2) → (4,2)
  });
});

describe('queda dos tiles', () => {
  it('o último tile cai exatamente no fim da duração', () => {
    const world = worldFrom(['#####', '#P..#', '#...#', '#...#', '#####']);
    startCollapse(world, 18); // 9 tiles em 18 ticks: um a cada 2
    const events: GameEvent[] = [];
    for (let i = 0; i < 17; i++) events.push(...stepAndCollapse(world, 1));
    expect(ofType(events, 'morte_subita.bloco_caiu')).toHaveLength(8);
    events.push(...stepAndCollapse(world, 1));
    expect(ofType(events, 'morte_subita.bloco_caiu')).toHaveLength(9);
    expect(world.grid.tiles.every((t) => t === WALL)).toBe(true);
  });

  it('esmaga quem está no tile, mesmo montado; bomba some sem explodir; item e chama somem', () => {
    const world = worldFrom(['#####', '#P..#', '#...#', '#...#', '#####'], 1, {
      mountInvulnerableTicks: 99,
    });
    run(world, 1, [{ type: 'debugItem', playerId: 0, itemId: 'ovo_capivara' }]);
    const bomb: Bomb = { id: 99, ownerId: 0, x: 2, y: 1, fuse: 100, range: 1 };
    world.bombs.push(bomb);
    world.items[idx(world, 3, 1)] = 'fogo';
    world.flames[idx(world, 3, 2)] = 50;
    startCollapse(world, 9); // um tile por tick
    const events: GameEvent[] = [];
    for (let i = 0; i < 5; i++) events.push(...stepAndCollapse(world, 1));
    expect(ofType(events, 'jogador.morreu')).toEqual([
      { type: 'jogador.morreu', playerId: 0, cause: 'esmagado' },
    ]);
    expect(ofType(events, 'bomba.explodiu')).toHaveLength(0);
    expect(world.bombs).toHaveLength(0);
    expect(world.items[idx(world, 3, 1)]).toBeNull();
    expect(world.flames[idx(world, 3, 2)]).toBe(0);
    expect(ofType(events, 'morte_subita.bloco_caiu')[0]).toEqual({
      type: 'morte_subita.bloco_caiu',
      x: 1,
      y: 1,
    });
  });

  it('o item escondido no bloco some sem ser revelado', () => {
    const world = worldFrom(['#####', '#PB.#', '#...#', '#...#', '#####'], 1, {}, { fogo: 1 });
    expect(world.hiddenItems[idx(world, 2, 1)]).toBe('fogo');
    startCollapse(world, 9);
    const events: GameEvent[] = [];
    for (let i = 0; i < 3; i++) events.push(...stepAndCollapse(world, 1));
    expect(world.hiddenItems[idx(world, 2, 1)]).toBeNull();
    expect(ofType(events, 'item.revelado')).toHaveLength(0);
  });

  it('pulo: se o tile de pouso cai durante o pulo, morre esmagado', () => {
    const world = worldFrom(['######', '#P...#', '######']);
    run(world, 1, [{ type: 'debugItem', playerId: 0, itemId: 'ovo_sapo_saltador' }]);
    run(world, 1, [{ type: 'move', playerId: 0, dir: 'right' }]);
    run(world, 1, [{ type: 'move', playerId: 0, dir: null }]);
    run(world, 1, [{ type: 'action', playerId: 0 }]); // pula de (1,1) para (3,1)
    expect(player(world).jump).not.toBeNull();
    world.collapse = { order: [idx(world, 3, 1)], next: 0, dropAt: dropAtFor(world, 3, 1) };
    const events = stepAndCollapse(world, 1);
    expect(ofType(events, 'jogador.morreu')).toEqual([
      { type: 'jogador.morreu', playerId: 0, cause: 'esmagado' },
    ]);
  });
});

describe('na partida', () => {
  const map: MapDefinition = {
    tamanho: [7, 7],
    legenda: { '#': 'parede', '.': 'chao', P: 'spawn' },
    mapa: ['#######', '#P...P#', '#.....#', '#.....#', '#.....#', '#P...P#', '#######'],
    blocos: { densidade: 0 },
  };
  const newMatch = (): Match =>
    createMatch({
      map,
      terrains: testTerrains,
      rules: testRules,
      matchRules: {
        winsToWin: 2,
        roundTicks: 100,
        countdownTicks: 1,
        roundEndDelayTicks: 2,
        suddenDeathTicks: 25,
      },
      seed: 1,
      players: 4,
      items: testItems,
      mounts: testMounts,
    });
  const runMatch = (match: Match, ticks: number) => {
    const out: GameEvent[] = [];
    for (let i = 0; i < ticks; i++) stepMatch(match, [], out);
    return out;
  };

  it('começa quando o relógio chega ao limite e termina a rodada', () => {
    const match = newMatch();
    runMatch(match, 1); // contagem
    const before = runMatch(match, 74);
    expect(ofType(before, 'morte_subita.iniciou')).toHaveLength(0);
    const start = runMatch(match, 1);
    expect(start).toContainEqual({ type: 'morte_subita.iniciou', round: 1 });
    const rest = runMatch(match, 40);
    expect(ofType(rest, 'morte_subita.bloco_caiu').length).toBeGreaterThan(0);
    expect(ofType(rest, 'rodada.terminou')).toHaveLength(1);
  });

  it('a rodada nova começa sem queda', () => {
    const match = newMatch();
    runMatch(match, 1 + 75 + 40);
    expect(match.round).toBe(2);
    expect(match.world.collapse).toBeNull();
  });
});

describe('bots e a queda', () => {
  it('tiles que caem dentro do horizonte são perigo desde a queda, sem fim', () => {
    const world = worldFrom(['#####', '#P..#', '#...#', '#...#', '#####']);
    startCollapse(world, 90); // um tile a cada 10 ticks
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d, { collapseHorizonTicks: 25 });
    expect(d.start[idx(world, 1, 1)]).toBe(10);
    expect(d.end[idx(world, 1, 1)]).toBe(SAFE);
    expect(d.start[idx(world, 2, 1)]).toBe(20);
    expect(d.start[idx(world, 3, 1)]).toBe(SAFE); // cai em 30 > horizonte
  });
});

/** Um tick do mundo seguido da queda dos tiles (o que a partida faz). */
function stepAndCollapse(world: World, ticks: number): GameEvent[] {
  const out = ticks > 0 ? run(world, ticks) : [];
  advanceCollapse(world, out);
  return out;
}

function dropAtFor(world: World, x: number, y: number): Int32Array {
  const dropAt = new Int32Array(world.grid.tiles.length).fill(SAFE);
  dropAt[idx(world, x, y)] = world.tick + 1;
  return dropAt;
}
