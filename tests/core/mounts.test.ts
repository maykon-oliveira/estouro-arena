import { describe, expect, it } from 'vitest';
import { createBot, updateBot, type BotConfig } from '../../src/core/bots/bot';
import { computeDanger, createDangerMap } from '../../src/core/bots/dangerMap';
import { createPathSearch, searchPaths, UNREACHABLE } from '../../src/core/bots/paths';
import type { Command } from '../../src/core/commands';
import { step, type Bomb, type World } from '../../src/core/world';
import { items, mounts } from '../../src/data';
import type { GameEvent } from '../../src/events';
import { dropBomb, hold, player, run, testRules, worldFrom } from './helpers';

const idx = (world: World, x: number, y: number) => y * world.grid.cols + x;

const ofType = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

function give(world: World, itemId: string, playerId = 0): GameEvent[] {
  return run(world, 1, [{ type: 'debugItem', playerId, itemId }]);
}

const action = (world: World, playerId = 0) => run(world, 1, [{ type: 'action', playerId }]);

describe('dados reais', () => {
  it('mounts.json tem capivara e sapo; items.json tem os ovos', () => {
    expect(mounts.get('capivara')?.ability).toBeNull();
    expect(mounts.get('capivara')?.terrainOverrides['agua_funda']).toMatchObject({
      walkable: true,
    });
    const sapo = mounts.get('sapo_saltador');
    expect(sapo?.ability).toBe('jump');
    expect(items.get('ovo_capivara')).toMatchObject({ effect: 'mount', mount: 'capivara' });
    expect(items.get('ovo_sapo_saltador')).toMatchObject({
      effect: 'mount',
      mount: 'sapo_saltador',
    });
  });
});

describe('ovos e escudo', () => {
  it('pegar um ovo monta; já montado, o ovo fica no chão', () => {
    const world = worldFrom(['#####', '#P..#', '#####']);
    const events = give(world, 'ovo_capivara');
    expect(ofType(events, 'montaria.montou')).toEqual([
      { type: 'montaria.montou', playerId: 0, mountId: 'capivara' },
    ]);
    expect(player(world).mount).toBe('capivara');

    const again = give(world, 'ovo_sapo_saltador');
    expect(ofType(again, 'item.pego')).toHaveLength(0);
    expect(player(world).mount).toBe('capivara');
    expect(world.items[idx(world, 1, 1)]).toBe('ovo_sapo_saltador');
  });

  it('a chama tira a montaria; a invulnerabilidade segura a mesma explosão', () => {
    const world = worldFrom(['#####', '#P..#', '#####'], 1, { explosionTicks: 3 });
    give(world, 'ovo_capivara');
    const events = dropBomb(world);
    events.push(...run(world, testRules.fuseTicks + testRules.explosionTicks + 2));
    expect(ofType(events, 'montaria.perdida')).toEqual([
      { type: 'montaria.perdida', playerId: 0, mountId: 'capivara' },
    ]);
    expect(ofType(events, 'jogador.morreu')).toHaveLength(0);
    expect(player(world).mount).toBeNull();
    expect(player(world).alive).toBe(true);
  });

  it('acabou a invulnerabilidade ainda na chama, morre', () => {
    const world = worldFrom(['#####', '#P..#', '#####'], 1, {
      explosionTicks: 20,
      mountInvulnerableTicks: 5,
    });
    give(world, 'ovo_capivara');
    const events = dropBomb(world);
    events.push(...run(world, testRules.fuseTicks + 10));
    expect(ofType(events, 'montaria.perdida')).toHaveLength(1);
    expect(ofType(events, 'jogador.morreu')).toEqual([
      { type: 'jogador.morreu', playerId: 0, cause: 'fogo' },
    ]);
  });
});

describe('capivara', () => {
  it('nada na água funda e não fica lenta na água rasa', () => {
    const world = worldFrom(['#######', '#P==..#', '#######']);
    hold(world, 'right', 10);
    expect(player(world).x).toBeCloseTo(1, 5);
    give(world, 'ovo_capivara');
    hold(world, 'right', 20);
    expect(player(world).x).toBeCloseTo(3, 5);

    const shallow = worldFrom(['#######', '#Pwww.#', '#######']);
    give(shallow, 'ovo_capivara');
    hold(shallow, 'right', 30);
    expect(player(shallow).x).toBeCloseTo(4, 5);
  });

  it('perdendo a capivara na água funda, vai para o tile andável mais próximo', () => {
    const world = worldFrom(['#######', '#P=...#', '#.#####', '#######'], 1, { startRange: 1 });
    give(world, 'ovo_capivara');
    hold(world, 'right', 10); // (2,1), na água funda
    hold(world, null, 1);
    expect(Math.round(player(world).x)).toBe(2);
    // Uma bomba alheia ao lado: a chama atinge o jogador na água.
    const b: Bomb = { id: world.nextBombId++, ownerId: 1, x: 3, y: 1, fuse: 1, range: 1 };
    world.bombs.push(b);
    const events = run(world, 2);
    expect(ofType(events, 'montaria.perdida')).toHaveLength(1);
    // Mais próximo andável a partir de (2,1): cima/direita/baixo/esquerda → (3,1) é chão.
    expect(player(world).x).toBe(3);
    expect(player(world).y).toBe(1);
  });
});

describe('sapo-saltador', () => {
  it('pula por cima de parede e de bloco, 2 tiles na direção em que está virado', () => {
    const world = worldFrom(['#######', '#P#.B.#', '#######']);
    give(world, 'ovo_sapo_saltador');
    hold(world, 'right', 1); // vira para a direita (bloqueado pela parede)
    const events = action(world);
    expect(ofType(events, 'montaria.acao')).toEqual([
      {
        type: 'montaria.acao',
        playerId: 0,
        mountId: 'sapo_saltador',
        from: { x: 1, y: 1 },
        to: { x: 3, y: 1 },
      },
    ]);
    run(world, 4);
    expect(player(world).x).toBe(3);
    expect(player(world).jump).toBeNull();

    run(world, 10); // recarga
    action(world);
    run(world, 4);
    expect(player(world).x).toBe(5);
  });

  it('recusa pouso inválido sem gastar a recarga', () => {
    const world = worldFrom(['######', '#P.##.', '######']);
    give(world, 'ovo_sapo_saltador');
    hold(world, 'right', 1);
    expect(ofType(action(world), 'montaria.acao')).toHaveLength(0);
    expect(player(world).abilityCooldown).toBe(0);
  });

  it('no ar ignora chama; recarga impede pular de novo', () => {
    const world = worldFrom(['#######', '#P...##', '#######']);
    give(world, 'ovo_sapo_saltador');
    hold(world, 'right', 1);
    hold(world, null, 1); // virado para a direita, parado
    world.flames[idx(world, 2, 1)] = 30; // tile do meio em chama
    world.flames[idx(world, 1, 1)] = 30; // e o de partida também (no ar, não importa)
    action(world);
    const events = run(world, 4);
    expect(ofType(events, 'jogador.morreu')).toHaveLength(0);
    expect(player(world).x).toBe(3);
    expect(ofType(action(world), 'montaria.acao')).toHaveLength(0);
  });

  it('prioridade do action: primeiro a remota, depois o pulo', () => {
    const world = worldFrom(['#######', '#P....#', '#######']);
    give(world, 'remota');
    give(world, 'ovo_sapo_saltador');
    dropBomb(world);
    hold(world, 'right', 10); // (2,1), virado para a direita
    const first = action(world);
    expect(ofType(first, 'bomba.explodiu')).toHaveLength(1);
    expect(ofType(first, 'montaria.acao')).toHaveLength(0);
  });
});

describe('bots e montarias', () => {
  const sharp: BotConfig = {
    level: { reactionTicks: 1, mistakeChance: 0, aggression: 0, itemSearchTiles: 15 },
    escapeMarginTicks: 0,
  };

  it('vai buscar ovo se não está montado; montado, ignora', () => {
    const world = worldFrom(['#######', '#P....#', '#######']);
    world.items[idx(world, 4, 1)] = 'ovo_capivara';
    const bot = createBot(0, sharp, 1);
    const events: GameEvent[] = [];
    for (let t = 0; t < 60; t++) {
      const cmds: Command[] = [];
      updateBot(bot, world, cmds);
      step(world, cmds, events);
    }
    expect(player(world).mount).toBe('capivara');

    world.items[idx(world, 1, 1)] = 'ovo_sapo_saltador';
    const before = player(world).x;
    for (let t = 0; t < 30; t++) {
      const cmds: Command[] = [];
      updateBot(bot, world, cmds);
      step(world, cmds, events);
    }
    expect(player(world).x).toBeCloseTo(before, 5);
  });

  it('montado na capivara, a água funda entra nas rotas', () => {
    const world = worldFrom(['######', '#P==.#', '######']);
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d);
    const s = createPathSearch(world.grid.tiles.length);
    const base = { x: 1, y: 1, speed: testRules.playerSpeed, passBlocks: false };
    searchPaths(world, d, base, 0, s);
    expect(s.time[idx(world, 4, 1)]).toBe(UNREACHABLE);
    searchPaths(world, d, { ...base, mount: 'capivara' }, 0, s);
    expect(s.time[idx(world, 4, 1)]).not.toBe(UNREACHABLE);
  });
});
