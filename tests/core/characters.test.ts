import { describe, expect, it } from 'vitest';
import { createPathSearch, searchPaths, ticksPerTile } from '../../src/core/bots/paths';
import { computeDanger, createDangerMap } from '../../src/core/bots/dangerMap';
import { assignBotCharacters } from '../../src/core/characters';
import type { MapDefinition } from '../../src/core/grid';
import { createMatch, stepMatch } from '../../src/core/match';
import { startCollapse, advanceCollapse } from '../../src/core/suddenDeath';
import { step, type World } from '../../src/core/world';
import { characters, items, terrains } from '../../src/data';
import type { GameEvent } from '../../src/events';
import {
  dropBomb,
  hold,
  player,
  run,
  testCharacters,
  testRules,
  testTerrains,
  worldFrom,
} from './helpers';

const idx = (world: World, x: number, y: number) => y * world.grid.cols + x;

const ofType = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

const ROOM = ['#######', '#P....#', '#######'];

/** Solta uma bomba no tile do jogador e espera ela explodir e a chama apagar. */
function bombOnSelf(world: World): GameEvent[] {
  const events = dropBomb(world);
  events.push(...run(world, testRules.fuseTicks + testRules.explosionTicks + 2));
  return events;
}

describe('dados reais', () => {
  it('characters.json tem os 6 personagens do folclore, com ids citados existentes', () => {
    expect([...characters.keys()]).toEqual([
      'saci',
      'boitata',
      'iara',
      'curupira',
      'boto',
      'mula_sem_cabeca',
    ]);
    const abilities = new Set(
      [...items.values()].flatMap((i) => (i.effect === 'ability' ? [i.ability] : [])),
    );
    for (const c of characters.values()) {
      for (const a of c.passive.abilities ?? []) expect(abilities.has(a)).toBe(true);
      for (const t of Object.keys(c.passive.terrainOverrides ?? {})) {
        expect(terrains.has(t)).toBe(true);
      }
    }
  });
});

describe('passivas', () => {
  it('sem personagem, ninguém ganha nada (como na Fase 1)', () => {
    const p = player(worldFrom(ROOM));
    expect(p.character).toBeNull();
    expect(p).toMatchObject({ speedLevel: 0, range: testRules.startRange, flameShields: 0 });
    expect(p.abilities.size).toBe(0);
  });

  it('Saci nasce com 1 nível de patins e não passa do limite', () => {
    const world = worldFrom(ROOM, 1, {}, undefined, ['saci']);
    expect(player(world)).toMatchObject({ character: 'saci', speedLevel: 1 });
    run(world, 1, [{ type: 'debugItem', playerId: 0, itemId: 'patins' }]);
    run(world, 1, [{ type: 'debugItem', playerId: 0, itemId: 'patins' }]);
    expect(player(world).speedLevel).toBe(testRules.maxSpeedLevel);
  });

  it('Boitatá nasce com +1 de alcance, e a bomba dele vai mais longe', () => {
    const world = worldFrom(ROOM, 1, {}, undefined, ['boitata']);
    expect(player(world).range).toBe(testRules.startRange + 1);
    const events = dropBomb(world);
    events.push(...run(world, testRules.fuseTicks + 1));
    const tiles = ofType(events, 'bomba.explodiu')[0]?.tiles ?? [];
    expect(tiles.some((t) => t.x === 1 + testRules.startRange + 1 && t.y === 1)).toBe(true);
  });

  it('Boto já chuta; pegar o item chute não muda nada', () => {
    const world = worldFrom(ROOM, 1, {}, undefined, ['boto']);
    expect(player(world).abilities.has('chute')).toBe(true);
    const events = run(world, 1, [{ type: 'debugItem', playerId: 0, itemId: 'chute' }]);
    expect(ofType(events, 'item.pego')).toHaveLength(1);
    expect([...player(world).abilities]).toEqual(['chute']);
  });

  it('Iara anda na água rasa sem ficar lenta; os outros ficam', () => {
    const water = ['#######', '#Pwwww#', '#Pwwww#', '#######'];
    const world = worldFrom(water, 2, {}, undefined, ['iara', 'saci']);
    player(world, 1).speedLevel = 0; // compara só o terreno
    run(world, 10, [
      { type: 'move', playerId: 0, dir: 'right' },
      { type: 'move', playerId: 1, dir: 'right' },
    ]);
    // Meio tile no chão (5 ticks) e o resto na água: a 0,1 (Iara) ou a 0,05 tile por tick.
    expect(player(world, 0).x).toBeCloseTo(2);
    expect(player(world, 1).x).toBeCloseTo(1.75);
  });

  it('Iara na capivara: a sobreposição da montaria vale primeiro', () => {
    const world = worldFrom(['#####', '#P=.#', '#####'], 1, {}, undefined, ['iara']);
    run(world, 1, [{ type: 'debugItem', playerId: 0, itemId: 'ovo_capivara' }]);
    hold(world, 'right', 10);
    expect(player(world).x).toBeCloseTo(2);
  });

  it('rota de bot da Iara pela água rasa custa como chão', () => {
    const world = worldFrom(['#######', '#Pwwww#', '#######'], 1, {}, undefined, ['iara']);
    const iara = { x: 1, y: 1, speed: testRules.playerSpeed, passBlocks: false };
    const i = idx(world, 2, 1);
    const floor = ticksPerTile(world, idx(world, 1, 1), iara);
    expect(ticksPerTile(world, i, { ...iara, character: 'iara' })).toBe(floor);
    expect(ticksPerTile(world, i, iara)).toBe(floor * 2);
    // Rota inteira: igual à de um corredor só de chão.
    const arrival = (w: World, mover: typeof iara & { character?: string }) => {
      const d = createDangerMap(w.grid.tiles.length);
      computeDanger(w, d);
      const s = createPathSearch(w.grid.tiles.length);
      searchPaths(w, d, mover, 0, s);
      return s.time[idx(w, 5, 1)];
    };
    const dry = worldFrom(['#######', '#P....#', '#######']);
    expect(arrival(world, { ...iara, character: 'iara' })).toBe(arrival(dry, iara));
  });
});

describe('escudo da Mula sem Cabeça', () => {
  it('aguenta a primeira chama da rodada e morre na segunda', () => {
    const world = worldFrom(ROOM, 1, {}, undefined, ['mula_sem_cabeca']);
    const first = bombOnSelf(world);
    expect(ofType(first, 'personagem.escudo')).toEqual([
      { type: 'personagem.escudo', playerId: 0, characterId: 'mula_sem_cabeca' },
    ]);
    expect(ofType(first, 'jogador.morreu')).toHaveLength(0);
    expect(player(world)).toMatchObject({ alive: true, flameShields: 0 });

    const second = bombOnSelf(world);
    expect(ofType(second, 'jogador.morreu')).toHaveLength(1);
  });

  it('acabou a invulnerabilidade ainda na chama, morre', () => {
    const world = worldFrom(
      ROOM,
      1,
      { explosionTicks: 20, shieldInvulnerableTicks: 5 },
      undefined,
      ['mula_sem_cabeca'],
    );
    const events = dropBomb(world);
    events.push(...run(world, testRules.fuseTicks + 10));
    expect(ofType(events, 'personagem.escudo')).toHaveLength(1);
    expect(ofType(events, 'jogador.morreu')).toHaveLength(1);
  });

  it('montada, a montaria absorve e o escudo fica guardado', () => {
    const world = worldFrom(ROOM, 1, {}, undefined, ['mula_sem_cabeca']);
    run(world, 1, [{ type: 'debugItem', playerId: 0, itemId: 'ovo_capivara' }]);
    const events = bombOnSelf(world);
    expect(ofType(events, 'montaria.perdida')).toHaveLength(1);
    expect(ofType(events, 'personagem.escudo')).toHaveLength(0);
    expect(player(world).flameShields).toBe(1);
  });

  it('o escudo não salva da morte súbita', () => {
    const world = worldFrom(['#####', '#P..#', '#...#', '#...#', '#####'], 1, {}, undefined, [
      'mula_sem_cabeca',
    ]);
    startCollapse(world, 9);
    const events: GameEvent[] = [];
    for (let i = 0; i < 3; i++) {
      step(world, [], events);
      advanceCollapse(world, events);
    }
    expect(ofType(events, 'jogador.morreu')).toEqual([
      { type: 'jogador.morreu', playerId: 0, cause: 'esmagado' },
    ]);
  });

  it('o escudo volta na rodada seguinte (e os personagens continuam os mesmos)', () => {
    const map: MapDefinition = {
      tamanho: [7, 7],
      legenda: { '#': 'parede', '.': 'chao', P: 'spawn' },
      mapa: ['#######', '#P...P#', '#.....#', '#.....#', '#.....#', '#P...P#', '#######'],
      blocos: { densidade: 0 },
    };
    const match = createMatch({
      map,
      terrains: testTerrains,
      rules: testRules,
      matchRules: {
        winsToWin: 2,
        roundTicks: 100,
        countdownTicks: 1,
        roundEndDelayTicks: 1,
        suddenDeathTicks: 0,
      },
      seed: 3,
      players: 2,
      characters: testCharacters,
      playerCharacters: ['mula_sem_cabeca', 'boto'],
    });
    stepMatch(match, []);
    expect(match.phase).toBe('playing');
    const mula = match.world.players[0];
    if (!mula) throw new Error('sem jogador');
    mula.flameShields = 0;
    const rival = match.world.players[1];
    if (rival) rival.alive = false;
    for (let i = 0; i < 3 && match.round === 1; i++) stepMatch(match, []);
    expect(match.round).toBe(2);
    expect(match.world.players.map((p) => p.character)).toEqual(['mula_sem_cabeca', 'boto']);
    expect(match.world.players[0]?.flameShields).toBe(1);
  });
});

describe('personagens dos bots', () => {
  const ids = [...testCharacters.keys()];

  it('sorteia sem repetir e sem o personagem do jogador', () => {
    const picks = assignBotCharacters(ids, 'iara', 3, 42);
    expect(picks).toHaveLength(3);
    expect(new Set(picks).size).toBe(3);
    expect(picks).not.toContain('iara');
    for (const p of picks) expect(ids).toContain(p);
  });

  it('mesma seed, mesmo sorteio; seeds diferentes variam', () => {
    expect(assignBotCharacters(ids, 'saci', 3, 7)).toEqual(assignBotCharacters(ids, 'saci', 3, 7));
    const seen = new Set(
      Array.from({ length: 20 }, (_, s) => assignBotCharacters(ids, 'saci', 3, s).join()),
    );
    expect(seen.size).toBeGreaterThan(1);
  });

  it('faltando personagens, os bots restantes ficam sem', () => {
    expect(assignBotCharacters(['saci', 'iara'], 'saci', 3, 1)).toEqual(['iara', null, null]);
  });
});
