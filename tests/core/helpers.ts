import type { Command } from '../../src/core/commands';
import type { Direction } from '../../src/core/direction';
import type { MapDefinition } from '../../src/core/grid';
import {
  createWorld,
  step,
  type Player,
  type Rules,
  type TerrainRules,
  type World,
} from '../../src/core/world';
import type { GameEvent } from '../../src/events';

const floorLike = { blocksFire: false, destructible: false, allowsBomb: true };
const solid = { walkable: false, speedMultiplier: 1, blocksFire: true, allowsBomb: false };

export const testTerrains: ReadonlyMap<string, TerrainRules> = new Map([
  ['chao', { ...floorLike, walkable: true, speedMultiplier: 1 }],
  ['parede', { ...solid, destructible: false }],
  ['bloco', { ...solid, destructible: true }],
  ['lama', { ...floorLike, walkable: true, speedMultiplier: 0.5 }],
  ['agua_rasa', { ...floorLike, walkable: true, speedMultiplier: 1, allowsBomb: false }],
]);

/** 6 tiles/s a 60 ticks/s = 0,1 tile por tick, para contas fáceis. */
export const testRules: Rules = {
  tickRate: 60,
  playerSpeed: 6,
  cornerAssistTiles: 0.5,
  spawnSafeRadius: 0,
  fuseTicks: 10,
  explosionTicks: 3,
  startBombs: 1,
  startRange: 2,
};

/**
 * Mapa ASCII sem blocos sorteados: `#` parede, `.` chão, `B` bloco, `~` lama,
 * `w` água rasa, `P` spawn.
 */
export function worldFrom(mapa: string[], players = 1, rules: Partial<Rules> = {}): World {
  const map: MapDefinition = {
    tamanho: [mapa[0]?.length ?? 0, mapa.length],
    legenda: { '#': 'parede', '.': 'chao', B: 'bloco', '~': 'lama', w: 'agua_rasa', P: 'spawn' },
    mapa,
    blocos: { densidade: 0 },
  };
  return createWorld({
    map,
    terrains: testTerrains,
    rules: { ...testRules, ...rules },
    seed: 1,
    players,
  });
}

export function player(world: World, id = 0): Player {
  const p = world.players[id];
  if (!p) throw new Error(`sem jogador ${id}`);
  return p;
}

/** Segura uma direção por `ticks` ticks e devolve os eventos. */
export function hold(
  world: World,
  dir: Direction | null,
  ticks: number,
  playerId = 0,
): GameEvent[] {
  const cmd: Command = { type: 'move', playerId, dir };
  return run(world, ticks, [cmd]);
}

/** Roda `ticks` ticks; `first` entra no primeiro. Devolve todos os eventos. */
export function run(world: World, ticks: number, first: Command[] = []): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < ticks; i++) step(world, i === 0 ? first : [], events);
  return events;
}

export function dropBomb(world: World, playerId = 0): GameEvent[] {
  return run(world, 1, [{ type: 'bomb', playerId }]);
}
