import { describe, expect, it } from 'vitest';
import { createBot, updateBot, type BotConfig } from '../../src/core/bots/bot';
import { computeDanger, createDangerMap } from '../../src/core/bots/dangerMap';
import { createPathSearch, searchPaths, UNREACHABLE } from '../../src/core/bots/paths';
import type { Command } from '../../src/core/commands';
import { FLOOR } from '../../src/core/terrainIds';
import { step, type Bomb, type World } from '../../src/core/world';
import { terrains } from '../../src/data';
import type { GameEvent } from '../../src/events';
import { dropBomb, hold, player, run, testRules, worldFrom } from './helpers';

const idx = (world: World, x: number, y: number) => y * world.grid.cols + x;

const ofType = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

function bomb(world: World, x: number, y: number, fuse: number): Bomb {
  const b: Bomb = { id: world.nextBombId++, ownerId: 0, x, y, fuse, range: 2 };
  world.bombs.push(b);
  return b;
}

describe('terrenos reais (src/data/terrains.json)', () => {
  it('tem os 5 terrenos da Fase 1 com as propriedades da spec', () => {
    expect(terrains.get('agua_rasa')).toMatchObject({
      walkable: true,
      speedMultiplier: 0.6,
      allowsBomb: false,
    });
    expect(terrains.get('agua_funda')).toMatchObject({ walkable: false, blocksFire: false });
    expect(terrains.get('mato_alto')).toMatchObject({
      destructible: true,
      blocksFire: false,
      hides: true,
    });
    expect(terrains.get('gelo')).toMatchObject({ walkable: true, slippery: true });
    expect(terrains.get('lama')).toMatchObject({ speedMultiplier: 0.75 });
  });
});

describe('velocidade e passagem', () => {
  it('água rasa e lama deixam o jogador mais lento', () => {
    const floor = worldFrom(['#######', '#P....#', '#######']);
    const water = worldFrom(['#######', '#Pwwww#', '#######']);
    hold(floor, 'right', 10);
    hold(water, 'right', 10);
    // No chão: 1 tile em 10 ticks. Na água (×0,5 nos testes), a partir do 1º tile de água, metade.
    expect(player(water).x).toBeLessThan(player(floor).x);
  });

  it('água funda bloqueia o jogador, mas o fogo passa por cima', () => {
    const world = worldFrom(['#######', '#P=...#', '#.#####', '#######'], 1, { startRange: 3 });
    hold(world, 'right', 20);
    expect(player(world).x).toBeCloseTo(1, 5);
    const events = dropBomb(world);
    events.push(...run(world, testRules.fuseTicks));
    const boom = ofType(events, 'bomba.explodiu')[0];
    expect(boom?.tiles).toContainEqual({ x: 2, y: 1 });
    expect(boom?.tiles).toContainEqual({ x: 4, y: 1 });
  });

  it('não solta bomba na água rasa', () => {
    const world = worldFrom(['#####', '#Pw.#', '#####']);
    hold(world, 'right', 10);
    expect(ofType(dropBomb(world), 'bomba.colocada')).toHaveLength(0);
  });
});

describe('mato alto', () => {
  it('pega fogo, não para a explosão e vira chão (terreno.queimou)', () => {
    const world = worldFrom(['#######', '#P"".B#', '#.#####', '#######'], 1, { startRange: 4 });
    const events = dropBomb(world);
    events.push(...run(world, testRules.fuseTicks + testRules.explosionTicks));
    const boom = ofType(events, 'bomba.explodiu')[0];
    expect(boom?.tiles).toContainEqual({ x: 4, y: 1 });
    expect(boom?.tiles).toContainEqual({ x: 5, y: 1 });
    expect(ofType(events, 'terreno.queimou')).toEqual([
      { type: 'terreno.queimou', x: 2, y: 1, terrainId: 'mato_alto' },
      { type: 'terreno.queimou', x: 3, y: 1, terrainId: 'mato_alto' },
    ]);
    expect(ofType(events, 'bloco.destruido')).toEqual([{ type: 'bloco.destruido', x: 5, y: 1 }]);
    expect(world.grid.tiles[idx(world, 2, 1)]).toBe(FLOOR);
  });

  it('quem está no mato quando ele queima morre', () => {
    const world = worldFrom(['######', '#P".P#', '######'], 2);
    player(world, 1).x = 2; // jogador 1 escondido no mato
    const events = dropBomb(world);
    events.push(...run(world, testRules.fuseTicks));
    expect(ofType(events, 'jogador.morreu').map((e) => e.playerId)).toContain(1);
  });
});

describe('gelo', () => {
  it('desliza até o obstáculo, mesmo soltando o controle', () => {
    const world = worldFrom(['#######', '#P***##', '#######']);
    run(world, 6, [{ type: 'move', playerId: 0, dir: 'right' }]); // entra no gelo (x ≥ 1,5)
    run(world, 40, [{ type: 'move', playerId: 0, dir: null }]);
    expect(player(world).x).toBeCloseTo(4, 5);
    expect(player(world).iceSlide).toBeNull();
  });

  it('ignora o joystick no meio do deslize', () => {
    const world = worldFrom(['#######', '#P***##', '#.#.#.#', '#######']);
    run(world, 6, [{ type: 'move', playerId: 0, dir: 'right' }]);
    run(world, 5, [{ type: 'move', playerId: 0, dir: 'down' }]);
    expect(player(world).y).toBeCloseTo(1, 5);
    expect(player(world).x).toBeGreaterThan(2);
  });

  it('ao sair do gelo, para no centro do primeiro tile normal e devolve o controle', () => {
    const world = worldFrom(['########', '#P**...#', '########']);
    run(world, 6, [{ type: 'move', playerId: 0, dir: 'right' }]);
    run(world, 40, [{ type: 'move', playerId: 0, dir: null }]);
    expect(player(world).x).toBeCloseTo(4, 5);
    expect(player(world).iceSlide).toBeNull();
    hold(world, 'left', 5);
    expect(player(world).x).toBeLessThan(4);
  });

  it('para antes de uma bomba no caminho', () => {
    const world = worldFrom(['#######', '#P***.#', '#######']);
    bomb(world, 4, 1, 500);
    run(world, 6, [{ type: 'move', playerId: 0, dir: 'right' }]);
    run(world, 40, [{ type: 'move', playerId: 0, dir: null }]);
    expect(player(world).x).toBeCloseTo(3, 5);
  });

  it('gelo terminando em água funda: para no último gelo', () => {
    const world = worldFrom(['#######', '#P**=.#', '#######']);
    run(world, 6, [{ type: 'move', playerId: 0, dir: 'right' }]);
    run(world, 40, [{ type: 'move', playerId: 0, dir: null }]);
    expect(player(world).x).toBeCloseTo(3, 5);
  });
});

describe('bomba chutada e água', () => {
  it('a bomba chutada para antes da água rasa', () => {
    const world = worldFrom(['########', '#P.B.ww#', '########']);
    run(world, 1, [{ type: 'debugItem', playerId: 0, itemId: 'chute' }]);
    const b = bomb(world, 3, 1, 500);
    hold(world, 'right', 40);
    expect(b.x).toBe(4);
  });
});

describe('bots e terrenos', () => {
  const sharp: BotConfig = {
    level: { reactionTicks: 1, mistakeChance: 0, aggression: 1, itemSearchTiles: 15 },
    escapeMarginTicks: 0,
  };
  const at = (x: number, y: number) => ({ x, y, speed: testRules.playerSpeed, passBlocks: false });

  it('rota no gelo só continua reto; para onde o gelo bate', () => {
    const world = worldFrom(['#######', '#P**..#', '#.#*#.#', '#######']);
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d);
    const s = createPathSearch(world.grid.tiles.length);
    searchPaths(world, d, at(1, 1), 0, s);
    // Entrando no gelo pela esquerda, não dá para virar para baixo em (3,1).
    expect(s.time[idx(world, 3, 2)]).toBe(UNREACHABLE);
    expect(s.time[idx(world, 4, 1)]).not.toBe(UNREACHABLE);
  });

  it('deslizando no gelo, a rota não vira no primeiro passo', () => {
    const world = worldFrom(['#######', '#P***.#', '#.#.#.#', '#######']);
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d);
    const s = createPathSearch(world.grid.tiles.length);
    // Sobre o gelo em (3,1), deslizando para a direita: (3,2) não é alcançável virando agora.
    searchPaths(world, d, { ...at(3, 1), slide: 'right' }, 0, s);
    expect(s.time[idx(world, 3, 2)]).toBe(UNREACHABLE);
    searchPaths(world, d, at(3, 1), 0, s);
    expect(s.time[idx(world, 3, 2)]).not.toBe(UNREACHABLE);
  });

  it('não caça inimigo escondido no mato a mais de 1 tile', () => {
    const world = worldFrom(['########', '#P...."P#', '########'], 2);
    // O 1 fica no mato em (6,1); o 0 é o bot.
    player(world, 1).x = 6;
    const bot = createBot(0, sharp, 1);
    const events: GameEvent[] = [];
    for (let t = 0; t < 30; t++) {
      const cmds: Command[] = [];
      updateBot(bot, world, cmds);
      step(world, cmds, events);
    }
    expect(player(world).x).toBeCloseTo(1, 5);
  });
});
