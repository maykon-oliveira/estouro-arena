import type { GameEvent } from '../events';
import { placeBomb, updateBombs } from './bombs';
import type { Command } from './commands';
import type { Direction } from './direction';
import { generateGrid, type Grid, type MapDefinition } from './grid';
import { movePlayer } from './movement';
import { createRng, type Rng } from './rng';

/** Propriedades de terreno que a simulação consulta (subconjunto de src/data/terrains.json). */
export interface TerrainRules {
  walkable: boolean;
  speedMultiplier: number;
  blocksFire: boolean;
  destructible: boolean;
  allowsBomb: boolean;
}

/** Parâmetros de regra vindos de src/data/game.json (durações já em ticks). */
export interface Rules {
  tickRate: number;
  /** Tiles por segundo em terreno normal. */
  playerSpeed: number;
  /** Distância máxima (em tiles) que a assistência de curva desliza o jogador. */
  cornerAssistTiles: number;
  spawnSafeRadius: number;
  fuseTicks: number;
  explosionTicks: number;
  startBombs: number;
  startRange: number;
}

export interface Player {
  id: number;
  /** Posição contínua em tiles; inteiros = centro do tile. */
  x: number;
  y: number;
  facing: Direction;
  /** Direção segurada no momento (último comando de movimento). */
  moveDir: Direction | null;
  alive: boolean;
  /** Bombas simultâneas permitidas. */
  maxBombs: number;
  /** Alcance da explosão em tiles. */
  range: number;
}

export interface Bomb {
  id: number;
  ownerId: number;
  x: number;
  y: number;
  /** Ticks até explodir. */
  fuse: number;
  range: number;
}

export interface World {
  tick: number;
  grid: Grid;
  players: Player[];
  bombs: Bomb[];
  /** Ticks restantes de chama por tile (0 = sem chama), mesmo índice de `grid.tiles`. */
  flames: number[];
  nextBombId: number;
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
  const { rules } = options;
  const rng = createRng(options.seed);
  const grid = generateGrid(options.map, rng, rules.spawnSafeRadius);
  if (options.players > grid.spawns.length) {
    throw new Error(`mapa tem ${grid.spawns.length} spawns para ${options.players} jogadores`);
  }
  const players = grid.spawns.slice(0, options.players).map((s, id): Player => ({
    id,
    x: s.x,
    y: s.y,
    facing: 'down',
    moveDir: null,
    alive: true,
    maxBombs: rules.startBombs,
    range: rules.startRange,
  }));
  return {
    tick: 0,
    grid,
    players,
    bombs: [],
    flames: new Array<number>(grid.tiles.length).fill(0),
    nextBombId: 0,
    terrains: options.terrains,
    rules,
    rng,
  };
}

/**
 * Avança a simulação em exatamente um tick: comandos → movimento → bombas/chamas → mortes.
 * Os eventos do tick são acrescentados em `out` (também devolvido).
 */
export function step(
  world: World,
  commands: readonly Command[],
  out: GameEvent[] = [],
): GameEvent[] {
  for (const cmd of commands) {
    const player = world.players[cmd.playerId];
    if (!player?.alive) continue;
    if (cmd.type === 'move') player.moveDir = cmd.dir;
    else if (cmd.type === 'bomb') placeBomb(world, player, out);
  }

  for (const player of world.players) {
    if (player.alive) movePlayer(world, player);
  }

  updateBombs(world, out);
  killPlayersInFlames(world, out);

  world.tick++;
  return out;
}

function killPlayersInFlames(world: World, out: GameEvent[]): void {
  for (const player of world.players) {
    if (!player.alive) continue;
    const i = Math.round(player.y) * world.grid.cols + Math.round(player.x);
    if ((world.flames[i] ?? 0) > 0) {
      player.alive = false;
      player.moveDir = null;
      out.push({ type: 'jogador.morreu', playerId: player.id });
    }
  }
}
