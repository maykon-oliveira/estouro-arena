import type { Command } from './commands';
import type { Direction } from './direction';
import { generateGrid, type Grid, type MapDefinition } from './grid';
import { movePlayer } from './movement';
import { createRng, type Rng } from './rng';

/** Propriedades de terreno que a simulação consulta (subconjunto de src/data/terrains.json). */
export interface TerrainRules {
  walkable: boolean;
  speedMultiplier: number;
}

/** Parâmetros de regra vindos de src/data/game.json. */
export interface Rules {
  tickRate: number;
  /** Tiles por segundo em terreno normal. */
  playerSpeed: number;
  /** Distância máxima (em tiles) que a assistência de curva desliza o jogador. */
  cornerAssistTiles: number;
  spawnSafeRadius: number;
}

export interface Player {
  id: number;
  /** Posição contínua em tiles; inteiros = centro do tile. */
  x: number;
  y: number;
  facing: Direction;
  /** Direção segurada no momento (último comando de movimento). */
  moveDir: Direction | null;
}

export interface World {
  tick: number;
  grid: Grid;
  players: Player[];
  readonly terrains: ReadonlyMap<string, TerrainRules>;
  readonly rules: Rules;
  readonly rng: Rng;
}

export interface WorldOptions {
  map: MapDefinition;
  terrains: ReadonlyMap<string, TerrainRules>;
  rules: Rules;
  seed: number;
  players: number;
}

export function createWorld(options: WorldOptions): World {
  const rng = createRng(options.seed);
  const grid = generateGrid(options.map, rng, options.rules.spawnSafeRadius);
  if (options.players > grid.spawns.length) {
    throw new Error(`mapa tem ${grid.spawns.length} spawns para ${options.players} jogadores`);
  }
  const players = grid.spawns
    .slice(0, options.players)
    .map((s, id): Player => ({ id, x: s.x, y: s.y, facing: 'down', moveDir: null }));
  return { tick: 0, grid, players, terrains: options.terrains, rules: options.rules, rng };
}

/** Avança a simulação em exatamente um tick. */
export function step(world: World, commands: readonly Command[]): void {
  for (const cmd of commands) {
    const player = world.players[cmd.playerId];
    if (!player) continue;
    if (cmd.type === 'move') player.moveDir = cmd.dir;
  }

  for (const player of world.players) movePlayer(world, player);

  world.tick++;
}
