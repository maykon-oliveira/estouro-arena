import { describe, expect, it } from 'vitest';
import { createBot, updateBot, type BotConfig } from '../../src/core/bots/bot';
import { computeDanger, createDangerMap, SAFE } from '../../src/core/bots/dangerMap';
import type { Command } from '../../src/core/commands';
import { step, type Bomb, type World } from '../../src/core/world';
import type { GameEvent } from '../../src/events';
import { dropBomb, hold, player, run, testRules, worldFrom } from './helpers';

const idx = (world: World, x: number, y: number) => y * world.grid.cols + x;

function bomb(world: World, x: number, y: number, fuse: number, ownerId = 0): Bomb {
  const b: Bomb = { id: world.nextBombId++, ownerId, x, y, fuse, range: 2 };
  world.bombs.push(b);
  return b;
}

function give(world: World, itemId: string, playerId = 0): void {
  run(world, 1, [{ type: 'debugItem', playerId, itemId }]);
}

const ofType = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

describe('chute', () => {
  const corridor = ['########', '#P.B...#', '########'];

  it('com chute, andar contra a bomba a faz deslizar até a parede', () => {
    const world = worldFrom(corridor);
    give(world, 'chute');
    const b = bomb(world, 3, 1, 100);
    const events = hold(world, 'right', 40);
    expect(ofType(events, 'bomba.chutada')).toEqual([
      { type: 'bomba.chutada', bombId: b.id, playerId: 0, dir: 'right' },
    ]);
    expect(ofType(events, 'bomba.parou')).toEqual([
      { type: 'bomba.parou', bombId: b.id, x: 6, y: 1 },
    ]);
    expect(b.x).toBe(6);
    expect(b.slideProgress ?? 0).toBe(0);
    expect(b.slide ?? null).toBeNull();
  });

  it('para antes de outra bomba', () => {
    const world = worldFrom(corridor);
    give(world, 'chute');
    const b = bomb(world, 3, 1, 100);
    bomb(world, 6, 1, 100);
    hold(world, 'right', 40);
    expect(b.x).toBe(5);
  });

  it('para antes de um jogador', () => {
    const world = worldFrom(['########', '#P.B..P#', '########'], 2);
    give(world, 'chute');
    const b = bomb(world, 3, 1, 100);
    hold(world, 'right', 40);
    expect(b.x).toBe(5);
  });

  it('sem chute, a bomba barra o jogador e não se move', () => {
    const world = worldFrom(corridor);
    const b = bomb(world, 3, 1, 100);
    const events = hold(world, 'right', 40);
    expect(ofType(events, 'bomba.chutada')).toHaveLength(0);
    expect(b.x).toBe(3);
    expect(player(world).x).toBeCloseTo(2, 5);
  });

  it('bomba encostada em obstáculo não é chutada', () => {
    const world = worldFrom(['#####', '#P.##', '#####']);
    give(world, 'chute');
    const b = bomb(world, 2, 1, 100);
    const events = hold(world, 'right', 20);
    expect(ofType(events, 'bomba.chutada')).toHaveLength(0);
    expect(b.x).toBe(2);
  });

  it('o pavio corre no deslize: explode no tile a que pertence', () => {
    const world = worldFrom(corridor);
    give(world, 'chute');
    bomb(world, 3, 1, 14);
    const events = hold(world, 'right', 20);
    const boom = ofType(events, 'bomba.explodiu')[0];
    expect(boom?.x).toBeGreaterThan(3);
    expect(boom?.x).toBeLessThan(6);
  });

  it('deslizando para dentro de uma chama, detona', () => {
    const world = worldFrom(corridor);
    give(world, 'chute');
    bomb(world, 3, 1, 100);
    world.flames[idx(world, 5, 1)] = 200;
    const events = hold(world, 'right', 30);
    expect(ofType(events, 'bomba.explodiu')[0]).toMatchObject({ x: 5, y: 1 });
  });
});

describe('bomba remota', () => {
  it('não explode sozinha; action detona no mesmo tick', () => {
    const world = worldFrom(['#######', '#P....#', '#######']);
    give(world, 'remota');
    dropBomb(world);
    hold(world, 'right', 30);
    const waited = run(world, testRules.fuseTicks * 3);
    expect(ofType(waited, 'bomba.explodiu')).toHaveLength(0);
    expect(world.bombs[0]?.remote).toBe(true);

    const events = run(world, 1, [{ type: 'action', playerId: 0 }]);
    expect(ofType(events, 'bomba.explodiu')).toHaveLength(1);
    expect(world.bombs).toHaveLength(0);
  });

  it('action detona a mais antiga, uma por toque', () => {
    const world = worldFrom(['#######', '#P....#', '#######'], 1, { startRange: 1 });
    give(world, 'remota');
    give(world, 'bomba');
    const first = dropBomb(world);
    hold(world, 'right', 30); // (4,1)
    dropBomb(world);
    const firstId = ofType(first, 'bomba.colocada')[0]?.bombId;

    hold(world, 'left', 10); // (3,1): fora da cruz da primeira (alcance 1)
    const events = run(world, 1, [{ type: 'action', playerId: 0 }]);
    expect(ofType(events, 'bomba.explodiu').map((e) => e.bombId)).toEqual([firstId]);
    expect(world.bombs).toHaveLength(1);
  });

  it('se o dono morre, as remotas ganham pavio normal', () => {
    const world = worldFrom(['#######', '#P....#', '#######']);
    give(world, 'remota');
    dropBomb(world);
    hold(world, 'right', 30);
    player(world).alive = false;
    run(world, 1);
    expect(world.bombs[0]?.remote).toBe(false);
    const events = run(world, testRules.fuseTicks);
    expect(ofType(events, 'bomba.explodiu')).toHaveLength(1);
  });

  it('action sem bomba remota não faz nada', () => {
    const world = worldFrom(['#######', '#P....#', '#######']);
    dropBomb(world);
    const events = run(world, 1, [{ type: 'action', playerId: 0 }]);
    expect(events).toEqual([]);
    expect(world.bombs).toHaveLength(1);
  });

  it('perfurante e remota convivem', () => {
    const world = worldFrom(['#######', '#P.B.B#', '#.#####', '#######'], 1, { startRange: 4 });
    give(world, 'remota');
    give(world, 'perfurante');
    const placed = dropBomb(world);
    expect(ofType(placed, 'bomba.colocada')).toHaveLength(1);
    expect(world.bombs[0]?.remote).toBe(true);
    expect(world.bombs[0]?.pierce).toBe(true);
  });
});

describe('bots e remota', () => {
  const sharp: BotConfig = {
    level: { reactionTicks: 1, mistakeChance: 0, aggression: 0, itemSearchTiles: 15 },
    escapeMarginTicks: 0,
  };

  it('detona a remota quando o inimigo está na cruz e ele está fora', () => {
    const world = worldFrom(['#######', '#P...P#', '#######'], 2);
    give(world, 'remota');
    const b = bomb(world, 4, 1, 100);
    b.remote = true;
    const bot = createBot(0, sharp, 1);
    const events: GameEvent[] = [];
    for (let t = 0; t < 5; t++) {
      const cmds: Command[] = [];
      updateBot(bot, world, cmds);
      step(world, cmds, events);
    }
    expect(ofType(events, 'bomba.explodiu')).toHaveLength(1);
    expect(world.players[1]?.alive).toBe(false);
    expect(world.players[0]?.alive).toBe(true);
  });

  it('remota alheia é perigo imediato e sem fim; a própria não tem tempo', () => {
    const world = worldFrom(['#######', '#P...P#', '#######'], 2);
    const other = bomb(world, 3, 1, 100, 1);
    other.remote = true;
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d, { viewerId: 0 });
    expect(d.start[idx(world, 2, 1)]).toBe(0);
    expect(d.end[idx(world, 2, 1)]).toBe(SAFE);

    computeDanger(world, d, { viewerId: 1 });
    expect(d.start[idx(world, 2, 1)]).toBe(SAFE);
  });
});
