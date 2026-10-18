import { describe, expect, it } from 'vitest';
import type { Bomb, World } from '../../src/core/world';
import { characters, gameConfig } from '../../src/data';
import type { GameEvent } from '../../src/events';
import { player, run, testRules, worldFrom } from './helpers';

const ofType = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

/** Bomba pronta para explodir no próximo tick (o dono não precisa estar perto). */
function bombAt(world: World, ownerId: number, x: number, y: number, range = 1): Bomb {
  const bomb: Bomb = { id: world.nextBombId++, ownerId, x, y, fuse: 1, range };
  world.bombs.push(bomb);
  return bomb;
}

/** Explode e espera a chama apagar (os blocos viram chão no fim da chama). */
const burn = (world: World) => run(world, 1 + testRules.explosionTicks + 1);

describe('dados reais', () => {
  it('game.json tem a barra; Saci, Boto e Mula têm especial', () => {
    expect(gameConfig.energy).toEqual({ max: 100, perBlock: 10, perKnockout: 40, perSecond: 1 });
    expect(characters.get('saci')?.special).toEqual({ type: 'teleport', tiles: 3 });
    expect(characters.get('boto')?.special).toEqual({ type: 'charm', durationTicks: 120 });
    expect(characters.get('mula_sem_cabeca')?.special).toEqual({
      type: 'dash',
      tiles: 4,
      ticksPerTile: 5,
    });
  });
});

describe('ganhos de energia', () => {
  it('+10 por bloco destruído pela própria bomba (quando a chama apaga)', () => {
    const world = worldFrom(['#######', '#P.B.B#', '#######']);
    bombAt(world, 0, 4, 1);
    const events = run(world, 1);
    expect(player(world).energy).toBe(0); // ainda queimando
    events.push(...burn(world));
    expect(ofType(events, 'bloco.destruido')).toHaveLength(2);
    expect(player(world).energy).toBe(20);
  });

  it('em cadeia, cada bomba credita o próprio dono', () => {
    const world = worldFrom(['#########', '#P.....P#', '#B..B...#', '#########'], 2);
    bombAt(world, 0, 2, 2); // pega o bloco (1, 2) e a bomba do jogador 1 em (3, 2)
    const theirs = bombAt(world, 1, 3, 2);
    theirs.fuse = 99;
    burn(world);
    expect(player(world, 0).energy).toBe(10); // bloco (1, 2)
    expect(player(world, 1).energy).toBe(10); // bloco (4, 2)
  });

  it('+40 por rival nocauteado; a própria bomba não dá nada', () => {
    const world = worldFrom(['#######', '#P...P#', '#######'], 2);
    bombAt(world, 0, 4, 1);
    const events = run(world, 1);
    expect(ofType(events, 'jogador.morreu')).toEqual([
      { type: 'jogador.morreu', playerId: 1, cause: 'fogo' },
    ]);
    expect(player(world, 0).energy).toBe(40);

    const solo = worldFrom(['#####', '#P..#', '#####'], 1);
    bombAt(solo, 0, 1, 1);
    run(solo, 1);
    expect(player(solo).alive).toBe(false);
    expect(player(solo).energy).toBe(0);
  });

  it('+1 a cada segundo vivo', () => {
    const world = worldFrom(['#####', '#P..#', '#####']);
    run(world, testRules.tickRate * 3);
    expect(player(world).energy).toBe(3);
  });

  it('para no máximo e avisa uma vez', () => {
    const world = worldFrom(['#####', '#P..#', '#####']);
    player(world).energy = testRules.energyMax - 1;
    const events = run(world, testRules.tickRate * 3);
    expect(player(world).energy).toBe(testRules.energyMax);
    expect(ofType(events, 'energia.cheia')).toEqual([{ type: 'energia.cheia', playerId: 0 }]);
  });

  it('o painel de debug enche a barra', () => {
    const world = worldFrom(['#####', '#P..#', '#####']);
    const events = run(world, 1, [{ type: 'debugEnergy', playerId: 0 }]);
    expect(player(world).energy).toBe(testRules.energyMax);
    expect(ofType(events, 'energia.cheia')).toHaveLength(1);
  });
});
