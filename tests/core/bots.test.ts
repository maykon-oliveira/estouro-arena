import { describe, expect, it } from 'vitest';
import { createBot, runBots, updateBot, type Bot, type BotConfig } from '../../src/core/bots/bot';
import { computeDanger, createDangerMap, SAFE } from '../../src/core/bots/dangerMap';
import { createPathSearch, pathTo, searchPaths, UNREACHABLE } from '../../src/core/bots/paths';
import type { Command } from '../../src/core/commands';
import { createMatch, stepMatch } from '../../src/core/match';
import { createWorld, step, type Bomb, type World } from '../../src/core/world';
import { botConfigs, gameConfig, items, maps, terrains } from '../../src/data';
import { matchRulesFromConfig, rulesFromConfig } from '../../src/data/rules';
import type { GameEvent } from '../../src/events';
import { testRules, worldFrom } from './helpers';

const idx = (world: World, x: number, y: number) => y * world.grid.cols + x;

/** Quem anda nas rotas dos testes: velocidade padrão dos testes, sem atravessar blocos. */
const at = (x: number, y: number) => ({ x, y, speed: testRules.playerSpeed, passBlocks: false });

function bomb(world: World, x: number, y: number, fuse: number, range: number, ownerId = 0): Bomb {
  const b: Bomb = { id: world.nextBombId++, ownerId, x, y, fuse, range };
  world.bombs.push(b);
  return b;
}

/** Bot "perfeito" e rápido para testes: decide todo tick, nunca erra, sem folga. */
const sharp: BotConfig = {
  level: { reactionTicks: 1, mistakeChance: 0, aggression: 0, itemSearchTiles: 15 },
  escapeMarginTicks: 0,
};

/** Roda `ticks` ticks com os bots controlando seus jogadores; `first` entra no 1º tick. */
function runWithBots(world: World, bots: Bot[], ticks: number, first: Command[] = []): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    const cmds: Command[] = i === 0 ? [...first] : [];
    for (const b of bots) updateBot(b, world, cmds);
    step(world, cmds, events);
  }
  return events;
}

const placedBy = (events: GameEvent[], playerId: number) =>
  events.filter((e) => e.type === 'bomba.colocada' && e.playerId === playerId);

describe('mapa de perigo', () => {
  const map = ['#######', '#P....#', '#.#.#.#', '#.....#', '#######'];

  it('marca a cruz da bomba com [pavio, pavio + chama)', () => {
    const world = worldFrom(map);
    bomb(world, 3, 1, 10, 2);
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d);
    for (const [x, y] of [
      [3, 1],
      [1, 1],
      [2, 1],
      [4, 1],
      [5, 1],
      [3, 2],
      [3, 3],
    ] as const) {
      expect(d.start[idx(world, x, y)], `${x},${y}`).toBe(10);
      expect(d.end[idx(world, x, y)], `${x},${y}`).toBe(10 + testRules.explosionTicks);
    }
    expect(d.start[idx(world, 1, 3)]).toBe(SAFE);
    expect(d.start[idx(world, 2, 2)]).toBe(SAFE); // parede
  });

  it('a parede corta a cruz', () => {
    const world = worldFrom(map);
    bomb(world, 1, 1, 10, 3);
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d);
    expect(d.start[idx(world, 1, 3)]).toBe(10);
    expect(d.start[idx(world, 2, 2)]).toBe(SAFE);
    expect(d.start[idx(world, 2, 3)]).toBe(SAFE);
  });

  it('cadeia: a bomba atingida herda o menor tempo', () => {
    const world = worldFrom(map);
    bomb(world, 1, 1, 10, 2);
    bomb(world, 3, 1, 50, 1);
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d);
    expect(d.start[idx(world, 4, 1)]).toBe(10);
    expect(d.start[idx(world, 3, 2)]).toBe(10);
  });

  it('chama ativa é perigo agora, até apagar', () => {
    const world = worldFrom(map);
    world.flames[idx(world, 5, 3)] = 5;
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d);
    expect(d.start[idx(world, 5, 3)]).toBe(0);
    expect(d.end[idx(world, 5, 3)]).toBe(5);
  });

  it('considera uma bomba hipotética sem mexer no mundo', () => {
    const world = worldFrom(map);
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d, { id: -1, ownerId: 0, x: 1, y: 1, fuse: 20, range: 2 });
    expect(d.start[idx(world, 3, 1)]).toBe(20);
    expect(world.bombs).toHaveLength(0);
  });
});

describe('rotas', () => {
  it('tempo = quando o centro cruza a borda do tile (10 ticks por tile aqui)', () => {
    const world = worldFrom(['#######', '#P....#', '#######']);
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d);
    const s = createPathSearch(world.grid.tiles.length);
    searchPaths(world, d, at(1, 1), 0, s);
    expect(s.time[idx(world, 1, 1)]).toBe(0);
    expect(s.time[idx(world, 2, 1)]).toBe(5);
    expect(s.time[idx(world, 4, 1)]).toBe(25);
    const path: number[] = [];
    pathTo(s, idx(world, 4, 1), path);
    expect(path).toEqual([idx(world, 2, 1), idx(world, 3, 1), idx(world, 4, 1)]);
  });

  it('passa por um tile depois que a chama apaga, mas não com folga que cruze o perigo', () => {
    const world = worldFrom(['#######', '#P....#', '#######']);
    world.flames[idx(world, 3, 1)] = 15;
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d);
    const s = createPathSearch(world.grid.tiles.length);

    searchPaths(world, d, at(1, 1), 0, s);
    expect(s.time[idx(world, 3, 1)]).toBe(15);
    expect(s.time[idx(world, 4, 1)]).toBe(25);

    searchPaths(world, d, at(1, 1), 5, s);
    expect(s.time[idx(world, 3, 1)]).toBe(UNREACHABLE);
    expect(s.time[idx(world, 4, 1)]).toBe(UNREACHABLE);
  });

  it('o primeiro passo usa a posição real (perto da borda chega antes)', () => {
    const world = worldFrom(['#######', '#P....#', '#######']);
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d);
    const s = createPathSearch(world.grid.tiles.length);
    searchPaths(world, d, at(1.3, 1), 0, s);
    expect(s.time[idx(world, 2, 1)]).toBe(2);
    expect(s.time[idx(world, 3, 1)]).toBe(12);
  });

  it('não entra em tile com bomba (o de partida pode ter)', () => {
    const world = worldFrom(['#######', '#P....#', '#######']);
    bomb(world, 1, 1, 100, 1);
    bomb(world, 4, 1, 100, 1);
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d);
    const s = createPathSearch(world.grid.tiles.length);
    searchPaths(world, d, at(1, 1), 0, s);
    expect(s.time[idx(world, 3, 1)]).toBe(15);
    expect(s.time[idx(world, 4, 1)]).toBe(UNREACHABLE);
  });
});

describe('decisões do bot', () => {
  it('em perigo, foge para o tile seguro e sobrevive', () => {
    const world = worldFrom(['######', '#P...#', '#.####', '#.####', '######'], 1, {
      fuseTicks: 100,
    });
    const bot = createBot(0, sharp, 1);
    // O jogador (controlado pelo bot) começa sobre a própria bomba de alcance 2.
    const events = runWithBots(world, [bot], 110, [{ type: 'bomb', playerId: 0 }]);
    expect(events.some((e) => e.type === 'bomba.explodiu')).toBe(true);
    expect(world.players[0]?.alive).toBe(true);
    expect(Math.round(world.players[0]?.x ?? 0)).toBe(4);
  });

  it('não solta bomba sem rota de fuga', () => {
    const world = worldFrom(['#####', '#P.B#', '#####'], 1, { fuseTicks: 100 });
    const bot = createBot(0, sharp, 1);
    const events = runWithBots(world, [bot], 200);
    expect(placedBy(events, 0)).toHaveLength(0);
    expect(world.players[0]?.alive).toBe(true);
  });

  it('solta bomba quando o inimigo está na linha e há fuga, e foge', () => {
    const world = worldFrom(['#######', '#.P..P#', '#.#####', '#.....#', '#######'], 2, {
      fuseTicks: 100,
      startRange: 4,
    });
    const bot = createBot(0, sharp, 1);
    const events = runWithBots(world, [bot], 3);
    expect(placedBy(events, 0)).toHaveLength(1);
    runWithBots(world, [bot], 110);
    expect(world.players[0]?.alive).toBe(true);
    expect(world.players[1]?.alive).toBe(false);
  });

  it('vai até um bloco, abre caminho e se protege', () => {
    const world = worldFrom(['#######', '#P....#', '#.###B#', '#.....#', '#######'], 1, {
      fuseTicks: 100,
      startRange: 1,
    });
    const bot = createBot(0, sharp, 1);
    const events = runWithBots(world, [bot], 400);
    expect(events.some((e) => e.type === 'bloco.destruido')).toBe(true);
    expect(world.players[0]?.alive).toBe(true);
  });

  it('mesma seed → mesmos comandos (replay)', () => {
    const map = maps.get('arena_01');
    if (!map) throw new Error('arena_01');
    const play = () => {
      const world = createWorld({
        map,
        terrains,
        rules: rulesFromConfig(gameConfig),
        seed: 3,
        players: 4,
      });
      const config = botConfigs.get('medio');
      if (!config) throw new Error('medio');
      const bots = [0, 1, 2, 3].map((id) => createBot(id, config, 3));
      const events = runWithBots(world, bots, 900);
      return JSON.stringify(events);
    };
    expect(play()).toBe(play());
  });
});

describe('bots e itens', () => {
  it('vai buscar um item visível perto', () => {
    const world = worldFrom(['#######', '#P....#', '#######']);
    world.items[idx(world, 4, 1)] = 'fogo';
    const bot = createBot(0, sharp, 1);
    const events = runWithBots(world, [bot], 60);
    expect(events).toContainEqual({ type: 'item.pego', playerId: 0, itemId: 'fogo', x: 4, y: 1 });
    expect(world.players[0]?.range).toBe(testRules.startRange + 1);
  });

  it('ignora item além de itemSearchTiles', () => {
    const world = worldFrom(['#######', '#P....#', '#######']);
    world.items[idx(world, 5, 1)] = 'fogo';
    const near: BotConfig = { ...sharp, level: { ...sharp.level, itemSearchTiles: 2 } };
    const events = runWithBots(world, [createBot(0, near, 1)], 60);
    expect(events.some((e) => e.type === 'item.pego')).toBe(false);
  });

  it('o mapa de perigo segue o perfurante', () => {
    const world = worldFrom(['#######', '#P.BB.#', '#######']);
    bomb(world, 1, 1, 10, 5).pierce = true;
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d);
    expect(d.start[idx(world, 5, 1)]).toBe(10);
  });

  it('com atravessa_bloco, a rota passa por dentro de bloco (custo dobrado)', () => {
    const world = worldFrom(['######', '#PB..#', '######']);
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d);
    const s = createPathSearch(world.grid.tiles.length);
    searchPaths(world, d, at(1, 1), 0, s);
    expect(s.time[idx(world, 3, 1)]).toBe(UNREACHABLE);
    searchPaths(world, d, { ...at(1, 1), passBlocks: true }, 0, s);
    expect(s.time[idx(world, 2, 1)]).toBe(5);
    expect(s.time[idx(world, 3, 1)]).toBe(25);
  });
});

describe('bots na partida', () => {
  it('não agem na contagem', () => {
    const map = maps.get('arena_01');
    if (!map) throw new Error('arena_01');
    const match = createMatch({
      map,
      terrains,
      rules: rulesFromConfig(gameConfig),
      matchRules: matchRulesFromConfig(gameConfig),
      seed: 1,
      players: 4,
    });
    const config = botConfigs.get('dificil');
    if (!config) throw new Error('dificil');
    const bots = [1, 2, 3].map((id) => createBot(id, config, 1));
    const cmds: Command[] = [];
    runBots(match, bots, cmds);
    expect(match.phase).toBe('countdown');
    expect(cmds).toEqual([]);
  });
});

describe('partida só de bots (dados reais)', () => {
  it('4 bots médios jogam 3 rodadas por seed sem erro, e há vencedores', () => {
    const map = maps.get('arena_01');
    const config = botConfigs.get('medio');
    if (!map || !config) throw new Error('dados');
    let winners = 0;
    for (let seed = 0; seed < 6; seed++) {
      const match = createMatch({
        map,
        terrains,
        rules: rulesFromConfig(gameConfig),
        matchRules: matchRulesFromConfig(gameConfig),
        seed,
        players: 4,
      });
      const bots = [0, 1, 2, 3].map((id) => createBot(id, config, seed));
      const events: GameEvent[] = [];
      while (match.phase !== 'over' && match.round <= 3) {
        const cmds: Command[] = [];
        runBots(match, bots, cmds);
        stepMatch(match, cmds, events);
      }
      for (const e of events) if (e.type === 'rodada.terminou' && e.winnerId !== null) winners++;
    }
    expect(winners).toBeGreaterThan(0);
  });
});

describe('sobrevivência (dados reais)', () => {
  it('bot difícil sozinho na arena_01 (com itens) sobrevive 60 s em ≥ 90 % das seeds', () => {
    const map = maps.get('arena_01');
    const config = botConfigs.get('dificil');
    if (!map || !config) throw new Error('dados');
    const rules = rulesFromConfig(gameConfig);
    let survived = 0;
    let destroyed = 0;
    const seeds = 20;
    for (let seed = 0; seed < seeds; seed++) {
      const world = createWorld({
        map,
        terrains,
        rules,
        seed,
        players: 1,
        items,
        defaultItems: gameConfig.items.defaultDistribution,
      });
      const bot = createBot(0, config, seed);
      const events = runWithBots(world, [bot], 60 * gameConfig.tickRate);
      if (world.players[0]?.alive) survived++;
      destroyed += events.filter((e) => e.type === 'bloco.destruido').length;
    }
    expect(survived / seeds).toBeGreaterThanOrEqual(0.9);
    expect(destroyed / seeds).toBeGreaterThan(5);
  });
});
