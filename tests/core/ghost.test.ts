import { describe, expect, it } from 'vitest';
import { createBot, updateBot, type BotConfig } from '../../src/core/bots/bot';
import { computeDanger, createDangerMap, SAFE } from '../../src/core/bots/dangerMap';
import type { Command } from '../../src/core/commands';
import { ringPoint, ringPosition } from '../../src/core/ghost';
import { step, type World } from '../../src/core/world';
import type { GameEvent } from '../../src/events';
import { player, run, testRules, worldFrom } from './helpers';

const idx = (world: World, x: number, y: number) => y * world.grid.cols + x;

const ofType = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

// 9 × 7: borda de paredes, miolo 7 × 5 com um bloco em (4,3).
const MAP = [
  '#########',
  '#P.....P#',
  '#.......#',
  '#...B...#',
  '#.......#',
  '#P.....P#',
  '#########',
];

/** Mata o jogador e roda até ele virar fantasma. */
function becomeGhost(world: World, id: number): GameEvent[] {
  player(world, id).alive = false;
  player(world, id).deathTick = world.tick;
  return run(world, testRules.ghostDelayTicks + 1);
}

function ghostOf(world: World, id: number) {
  const g = player(world, id).ghost;
  if (!g) throw new Error(`jogador ${id} não é fantasma`);
  return g;
}

describe('anel da borda', () => {
  it('converte posição no perímetro em tile e volta (sentido horário do canto superior esquerdo)', () => {
    const world = worldFrom(MAP, 4);
    const { grid } = world;
    expect(ringPoint(grid, 0)).toEqual({ x: 0, y: 0 });
    expect(ringPoint(grid, 8)).toEqual({ x: 8, y: 0 });
    expect(ringPoint(grid, 10)).toEqual({ x: 8, y: 2 });
    expect(ringPoint(grid, 14)).toEqual({ x: 8, y: 6 });
    expect(ringPoint(grid, 16)).toEqual({ x: 6, y: 6 });
    expect(ringPoint(grid, 26)).toEqual({ x: 0, y: 2 });
    expect(ringPosition(grid, 3, 0)).toBe(3);
    expect(ringPosition(grid, 8, 2)).toBe(10);
    expect(ringPosition(grid, 0, 4)).toBe(24);
  });
});

describe('virar fantasma', () => {
  it('depois do atraso, surge no ponto do anel mais perto de onde morreu', () => {
    const world = worldFrom(MAP, 4);
    // Jogador 1 em (7,1): o mais perto é o lado de cima (7,0) (empate com a direita → cima).
    const events = becomeGhost(world, 1);
    expect(ofType(events, 'fantasma.surgiu')).toEqual([
      { type: 'fantasma.surgiu', playerId: 1, x: 7, y: 0 },
    ]);
    expect(player(world, 1).ghost).not.toBeNull();
    expect(player(world, 1).alive).toBe(false);
  });

  it('não surge antes do atraso', () => {
    const world = worldFrom(MAP, 4);
    player(world, 2).alive = false;
    player(world, 2).deathTick = world.tick;
    const events = run(world, testRules.ghostDelayTicks - 1);
    expect(ofType(events, 'fantasma.surgiu')).toHaveLength(0);
  });
});

describe('movimento no anel', () => {
  it('a direção que segue o lado move; a perpendicular não; na quina vira sozinho', () => {
    const world = worldFrom(MAP, 4);
    becomeGhost(world, 1); // (7,0), lado de cima
    const g = () => player(world, 1).ghost;
    run(world, 1, [{ type: 'move', playerId: 1, dir: 'down' }]); // perpendicular: parado
    expect(g()?.s).toBeCloseTo(7, 5);
    run(world, 10, [{ type: 'move', playerId: 1, dir: 'right' }]); // 0,1 tile por tick
    expect(g()?.s).toBeCloseTo(8, 5); // na quina (8,0)
    run(world, 10); // segue segurando →: vira para baixo sozinho
    const at = ringPoint(world.grid, g()?.s ?? 0);
    expect(at.x).toBeCloseTo(8, 5);
    expect(at.y).toBeCloseTo(1, 5);
  });
});

describe('arremesso', () => {
  it('pousa no 1º tile válido a partir de 3 da borda e vira bomba depois do voo', () => {
    const world = worldFrom(MAP, 4);
    becomeGhost(world, 1);
    // Leva o fantasma a (4,0): pousaria em (4,3), mas lá tem bloco → (4,4).
    ghostOf(world, 1).s = 4;
    const events = run(world, 1, [{ type: 'bomb', playerId: 1 }]);
    expect(ofType(events, 'fantasma.arremessou')).toEqual([
      { type: 'fantasma.arremessou', playerId: 1, from: { x: 4, y: 0 }, to: { x: 4, y: 4 } },
    ]);
    expect(world.bombs).toHaveLength(0);
    const landing = run(world, testRules.ghostFlightTicks);
    expect(ofType(landing, 'bomba.colocada')).toEqual([
      { type: 'bomba.colocada', bombId: 0, playerId: 1, x: 4, y: 4 },
    ]);
    expect(world.bombs[0]).toMatchObject({ x: 4, y: 4, range: testRules.startRange });
  });

  it('só 1 por rodada', () => {
    const world = worldFrom(MAP, 4);
    becomeGhost(world, 1);
    ghostOf(world, 1).s = 3;
    run(world, 1, [{ type: 'bomb', playerId: 1 }]);
    run(world, testRules.ghostFlightTicks);
    const again = run(world, 1, [{ type: 'bomb', playerId: 1 }]);
    expect(ofType(again, 'fantasma.arremessou')).toHaveLength(0);
  });

  it('sem tile válido, recusa sem gastar; na quina não arremessa', () => {
    const world = worldFrom(['#######', '#P...P#', '#.###.#', '#.###.#', '#P...P#', '#######'], 4);
    becomeGhost(world, 1);
    ghostOf(world, 1).s = 3; // (3,0): (3,3) é parede, (3,4) é a última linha jogável
    // A partir de 3 tiles: (3,3) parede; (3,4) chão → válido. Troca por coluna sem saída:
    world.grid.tiles[idx(world, 3, 4)] = 'parede';
    expect(
      ofType(run(world, 1, [{ type: 'bomb', playerId: 1 }]), 'fantasma.arremessou'),
    ).toHaveLength(0);
    expect(player(world, 1).ghost?.thrown).toBe(false);

    ghostOf(world, 1).s = 0; // quina
    expect(
      ofType(run(world, 1, [{ type: 'bomb', playerId: 1 }]), 'fantasma.arremessou'),
    ).toHaveLength(0);
  });

  it('o fantasma não pega item nem é atingido; não conta como vivo', () => {
    const world = worldFrom(MAP, 4);
    becomeGhost(world, 1);
    world.flames[idx(world, 7, 0)] = 10;
    const events = run(world, 5);
    expect(ofType(events, 'jogador.morreu')).toHaveLength(0);
    expect(player(world, 1).alive).toBe(false);
  });
});

describe('bots e fantasmas', () => {
  it('a bomba no ar é perigo no tile de pouso', () => {
    const world = worldFrom(MAP, 4);
    becomeGhost(world, 1);
    ghostOf(world, 1).s = 3;
    run(world, 1, [{ type: 'bomb', playerId: 1 }]); // pousa em (3,3)
    const d = createDangerMap(world.grid.tiles.length);
    computeDanger(world, d);
    expect(d.start[idx(world, 3, 3)]).not.toBe(SAFE);
    expect(d.start[idx(world, 3, 3)]).toBeGreaterThan(testRules.fuseTicks);
  });

  it('bot fantasma se alinha e arremessa no inimigo', () => {
    const world = worldFrom(MAP, 4);
    // Inimigos 0, 2, 3 vivos e parados; o 1 vira fantasma.
    becomeGhost(world, 1);
    const sharp: BotConfig = {
      level: { reactionTicks: 1, mistakeChance: 0, aggression: 1, itemSearchTiles: 15 },
      escapeMarginTicks: 0,
    };
    const bot = createBot(1, sharp, 1);
    const events: GameEvent[] = [];
    for (let t = 0; t < 200 && !player(world, 1).ghost?.thrown; t++) {
      const cmds: Command[] = [];
      updateBot(bot, world, cmds);
      step(world, cmds, events);
    }
    const thrown = ofType(events, 'fantasma.arremessou')[0];
    expect(thrown).toBeDefined();
    // O pouso fica na linha ou coluna de algum inimigo vivo.
    const enemies = [0, 2, 3].map((id) => player(world, id));
    expect(enemies.some((e) => e.x === thrown?.to.x || e.y === thrown?.to.y)).toBe(true);
  });
});
