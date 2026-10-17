import { describe, expect, it } from 'vitest';
import { generateGrid, type MapDefinition } from '../../src/core/grid';
import { hideItems } from '../../src/core/items';
import { createRng } from '../../src/core/rng';
import { BLOCK, FLOOR } from '../../src/core/terrainIds';
import { createWorld, type World } from '../../src/core/world';
import type { GameEvent } from '../../src/events';
import {
  dropBomb,
  hold,
  player,
  run,
  testItems,
  testRules,
  testTerrains,
  worldFrom,
} from './helpers';

const idx = (world: World, x: number, y: number) => y * world.grid.cols + x;

/** Põe um item visível no tile (atalho de teste; no jogo os itens saem dos blocos). */
function placeItem(world: World, x: number, y: number, itemId: string): void {
  world.items[idx(world, x, y)] = itemId;
}

const ofType = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

describe('sorteio dos itens nos blocos', () => {
  const map: MapDefinition = {
    tamanho: [9, 5],
    legenda: { '#': 'parede', '.': 'chao', P: 'spawn' },
    mapa: ['#########', '#P......#', '#.......#', '#......P#', '#########'],
    blocos: { densidade: 0.7 },
  };

  it('esconde um item por bloco, só em blocos, na quantidade pedida', () => {
    const rng = createRng(5);
    const grid = generateGrid(map, rng, 1);
    const hidden = hideItems(grid, { bomba: 2, fogo: 3 }, rng);
    expect(hidden.filter((id) => id === 'bomba')).toHaveLength(2);
    expect(hidden.filter((id) => id === 'fogo')).toHaveLength(3);
    hidden.forEach((id, i) => {
      if (id !== null) expect(grid.tiles[i]).toBe(BLOCK);
    });
  });

  it('itens a mais que blocos são descartados', () => {
    const rng = createRng(5);
    const grid = generateGrid(map, rng, 1);
    const blocks = grid.tiles.filter((t) => t === BLOCK).length;
    const hidden = hideItems(grid, { bomba: blocks + 10 }, rng);
    expect(hidden.filter((id) => id !== null)).toHaveLength(blocks);
  });

  it('é determinístico e não muda os blocos da seed', () => {
    const make = (itens?: Record<string, number>) =>
      createWorld({
        map: { ...map, blocos: itens ? { densidade: 0.7, itens } : { densidade: 0.7 } },
        terrains: testTerrains,
        rules: testRules,
        seed: 9,
        players: 2,
        items: testItems,
      });
    const a = make({ bomba: 3, patins: 2 });
    const b = make({ bomba: 3, patins: 2 });
    const none = make();
    expect(a.hiddenItems).toEqual(b.hiddenItems);
    expect(a.grid.tiles).toEqual(none.grid.tiles);
  });

  it('sem blocos.itens usa a distribuição padrão', () => {
    const world = createWorld({
      map,
      terrains: testTerrains,
      rules: testRules,
      seed: 9,
      players: 2,
      items: testItems,
      defaultItems: { fogo: 2 },
    });
    expect(world.hiddenItems.filter((id) => id === 'fogo')).toHaveLength(2);
  });
});

describe('revelação, coleta e destruição', () => {
  it('revela no bloco.destruido e a coleta aplica o efeito', () => {
    const world = worldFrom(
      ['#######', '#P.B..#', '#.#####', '#######'],
      1,
      { startRange: 1, fuseTicks: 100 },
      { fogo: 1 },
    );
    hold(world, 'right', 10); // (2,1), vizinho do bloco
    const events = dropBomb(world);
    events.push(...hold(world, 'left', 10)); // (1,1)
    events.push(...hold(world, 'down', 10)); // (1,2), fora da cruz
    events.push(...run(world, world.rules.fuseTicks + testRules.explosionTicks));
    expect(world.hiddenItems[idx(world, 3, 1)]).toBeNull();
    expect(ofType(events, 'item.revelado')).toEqual([
      { type: 'item.revelado', itemId: 'fogo', x: 3, y: 1 },
    ]);
    expect(world.items[idx(world, 3, 1)]).toBe('fogo');

    events.push(...hold(world, 'up', 10));
    events.push(...hold(world, 'right', 20)); // passa por (3,1)
    expect(ofType(events, 'item.pego')).toEqual([
      { type: 'item.pego', playerId: 0, itemId: 'fogo', x: 3, y: 1 },
    ]);
    expect(player(world).range).toBe(2);
    expect(world.items[idx(world, 3, 1)]).toBeNull();
  });

  it('explosão destrói item visível e não para nele', () => {
    const world = worldFrom(['#######', '#P....#', '#.#####', '#######'], 1, { startRange: 3 });
    placeItem(world, 3, 1, 'bomba');
    const events = dropBomb(world);
    events.push(...run(world, testRules.fuseTicks));
    expect(ofType(events, 'item.destruido')).toEqual([
      { type: 'item.destruido', itemId: 'bomba', x: 3, y: 1 },
    ]);
    const boom = ofType(events, 'bomba.explodiu')[0];
    expect(boom?.tiles).toContainEqual({ x: 4, y: 1 });
    expect(world.items[idx(world, 3, 1)]).toBeNull();
  });

  it('dois jogadores no tile do item: pega o de menor id', () => {
    const world = worldFrom(['#####', '#P.P#', '#####'], 2);
    placeItem(world, 2, 1, 'bomba');
    const events = run(world, 10, [
      { type: 'move', playerId: 1, dir: 'left' },
      { type: 'move', playerId: 0, dir: 'right' },
    ]);
    expect(ofType(events, 'item.pego').map((e) => e.playerId)).toEqual([0]);
  });
});

describe('efeitos', () => {
  const pick = (itemId: string, times = 1) => {
    const world = worldFrom(['####', '#P.#', '####']);
    for (let i = 0; i < times; i++) {
      run(world, 1, [{ type: 'debugItem', playerId: 0, itemId }]);
    }
    return player(world);
  };

  it('bomba +1 até o limite', () => {
    expect(pick('bomba').maxBombs).toBe(2);
    expect(pick('bomba', 5).maxBombs).toBe(testRules.maxBombs);
  });

  it('fogo +1 até o limite; fogo máximo vai direto ao limite', () => {
    expect(pick('fogo').range).toBe(3);
    expect(pick('fogo', 9).range).toBe(testRules.maxRange);
    expect(pick('fogo_max').range).toBe(testRules.maxRange);
  });

  it('patins sobe o nível de velocidade até o limite', () => {
    expect(pick('patins').speedLevel).toBe(1);
    expect(pick('patins', 5).speedLevel).toBe(testRules.maxSpeedLevel);
  });

  it('patins deixa o jogador mais rápido', () => {
    const slow = worldFrom(['#########', '#P......#', '#########']);
    const fast = worldFrom(['#########', '#P......#', '#########']);
    run(fast, 1, [{ type: 'debugItem', playerId: 0, itemId: 'patins' }]);
    hold(slow, 'right', 10);
    hold(fast, 'right', 10);
    // 6 tiles/s → 1 tile; com patins (+3) → 1,5 tile em 10 ticks.
    expect(player(slow).x).toBeCloseTo(2, 5);
    expect(player(fast).x).toBeCloseTo(2.5, 5);
  });

  it('item no limite é pego e some sem efeito', () => {
    const world = worldFrom(['####', '#P.#', '####']);
    for (let i = 0; i < 10; i++)
      run(world, 1, [{ type: 'debugItem', playerId: 0, itemId: 'fogo' }]);
    expect(player(world).range).toBe(testRules.maxRange);
    expect(world.items.every((id) => id === null)).toBe(true);
  });

  it('comando de debug com item desconhecido ou jogador morto é ignorado', () => {
    const world = worldFrom(['####', '#P.#', '####']);
    const events = run(world, 1, [{ type: 'debugItem', playerId: 0, itemId: 'nao_existe' }]);
    expect(events).toEqual([]);
    player(world).alive = false;
    run(world, 1, [{ type: 'debugItem', playerId: 0, itemId: 'bomba' }]);
    expect(player(world).maxBombs).toBe(1);
  });
});

describe('perfurante e atravessar blocos', () => {
  it('perfurante atravessa blocos e para na parede', () => {
    const world = worldFrom(['########', '#P.BB.##', '#.######', '########'], 1, { startRange: 5 });
    run(world, 1, [{ type: 'debugItem', playerId: 0, itemId: 'perfurante' }]);
    const events = dropBomb(world);
    events.push(...run(world, testRules.fuseTicks + testRules.explosionTicks));
    const tiles = ofType(events, 'bomba.explodiu')[0]?.tiles ?? [];
    expect(tiles).toContainEqual({ x: 3, y: 1 });
    expect(tiles).toContainEqual({ x: 4, y: 1 });
    expect(tiles).toContainEqual({ x: 5, y: 1 });
    expect(tiles).not.toContainEqual({ x: 6, y: 1 });
    expect(ofType(events, 'bloco.destruido')).toHaveLength(2);
  });

  it('sem perfurante, o fogo para no primeiro bloco', () => {
    const world = worldFrom(['########', '#P.BB.##', '#.######', '########'], 1, { startRange: 5 });
    const events = dropBomb(world);
    events.push(...run(world, testRules.fuseTicks + testRules.explosionTicks));
    expect(ofType(events, 'bloco.destruido')).toHaveLength(1);
  });

  it('atravessar blocos: entra no bloco, mas não solta bomba dentro dele', () => {
    const world = worldFrom(['######', '#PBB.#', '######']);
    hold(world, 'right', 10);
    expect(player(world).x).toBeCloseTo(1, 5);

    run(world, 1, [{ type: 'debugItem', playerId: 0, itemId: 'atravessa_bloco' }]);
    hold(world, 'right', 10);
    expect(Math.round(player(world).x)).toBe(2);
    expect(world.grid.tiles[idx(world, 2, 1)]).toBe(BLOCK);
    const events = dropBomb(world);
    expect(ofType(events, 'bomba.colocada')).toHaveLength(0);
    hold(world, 'right', 30);
    expect(Math.round(player(world).x)).toBe(4);
    expect(world.grid.tiles[idx(world, 4, 1)]).toBe(FLOOR);
  });
});
