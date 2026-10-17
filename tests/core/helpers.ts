import type { Command } from '../../src/core/commands';
import type { Direction } from '../../src/core/direction';
import type { MapDefinition } from '../../src/core/grid';
import type { ItemDef } from '../../src/core/items';
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
  ['agua_rasa', { ...floorLike, walkable: true, speedMultiplier: 0.5, allowsBomb: false }],
  ['agua_funda', { ...floorLike, walkable: false, speedMultiplier: 1, allowsBomb: false }],
  [
    'mato_alto',
    { ...floorLike, walkable: true, speedMultiplier: 1, destructible: true, hides: true },
  ],
  ['gelo', { ...floorLike, walkable: true, speedMultiplier: 1, slippery: true }],
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
  maxBombs: 3,
  maxRange: 5,
  speedStep: 3,
  maxSpeedLevel: 2,
  kickSpeed: 12,
};

/** Catálogo de itens dos testes (mesmos efeitos do src/data/items.json). */
export const testItems: ReadonlyMap<string, ItemDef> = new Map<string, ItemDef>([
  ['bomba', { id: 'bomba', effect: 'extra_bomb', amount: 1 }],
  ['fogo', { id: 'fogo', effect: 'extra_range', amount: 1 }],
  ['fogo_max', { id: 'fogo_max', effect: 'max_range' }],
  ['patins', { id: 'patins', effect: 'extra_speed', amount: 1 }],
  ['perfurante', { id: 'perfurante', effect: 'ability', ability: 'perfurante' }],
  ['atravessa_bloco', { id: 'atravessa_bloco', effect: 'ability', ability: 'atravessa_bloco' }],
  ['chute', { id: 'chute', effect: 'ability', ability: 'chute' }],
  ['remota', { id: 'remota', effect: 'ability', ability: 'remota' }],
]);

/**
 * Mapa ASCII sem blocos sorteados: `#` parede, `.` chão, `B` bloco, `~` lama,
 * `w` água rasa, `=` água funda, `"` mato alto, `*` gelo, `P` spawn.
 */
export function worldFrom(
  mapa: string[],
  players = 1,
  rules: Partial<Rules> = {},
  itens?: Record<string, number>,
): World {
  const map: MapDefinition = {
    tamanho: [mapa[0]?.length ?? 0, mapa.length],
    legenda: {
      '#': 'parede',
      '.': 'chao',
      B: 'bloco',
      '~': 'lama',
      w: 'agua_rasa',
      '=': 'agua_funda',
      '"': 'mato_alto',
      '*': 'gelo',
      P: 'spawn',
    },
    mapa,
    blocos: itens ? { densidade: 0, itens } : { densidade: 0 },
  };
  return createWorld({
    map,
    terrains: testTerrains,
    rules: { ...testRules, ...rules },
    seed: 1,
    players,
    items: testItems,
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
