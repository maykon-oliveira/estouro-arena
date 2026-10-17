import type { GameEvent } from '../events';
import type { Command } from './commands';
import type { Direction } from './direction';
import type { MapDefinition } from './grid';
import { createWorld, step, type Rules, type TerrainRules, type World } from './world';

/** Regras da partida vindas de src/data/game.json (durações já em ticks). */
export interface MatchRules {
  /** Vitórias de rodada para vencer a partida (melhor de 3 = 2). */
  winsToWin: number;
  /** Duração do relógio da rodada. */
  roundTicks: number;
  /** Contagem antes de cada rodada. */
  countdownTicks: number;
  /** Espera depois de sobrar ≤ 1 vivo, antes de dar a rodada. */
  roundEndDelayTicks: number;
}

export type MatchPhase = 'countdown' | 'playing' | 'ending' | 'over';

export interface MatchOptions {
  map: MapDefinition;
  terrains: ReadonlyMap<string, TerrainRules>;
  rules: Rules;
  matchRules: MatchRules;
  /** Seed da partida; a rodada r usa `seed + (r − 1)`. */
  seed: number;
  players: number;
}

export interface Match {
  readonly options: MatchOptions;
  phase: MatchPhase;
  /** Rodada atual, a partir de 1. */
  round: number;
  /** Ticks restantes da contagem ou da espera de fim. */
  phaseTicks: number;
  /** Ticks restantes no relógio da rodada. */
  clockTicks: number;
  /** Vitórias por jogador (índice = id). */
  wins: number[];
  /** Direção segurada por jogador; sobrevive à contagem e à troca de rodada. */
  heldDirs: (Direction | null)[];
  /** Mundo da rodada atual (recriado a cada rodada). */
  world: World;
  /** Vencedor da partida, quando `phase === 'over'`. */
  winnerId: number | null;
}

function roundWorld(options: MatchOptions, round: number): World {
  return createWorld({
    map: options.map,
    terrains: options.terrains,
    rules: options.rules,
    seed: options.seed + (round - 1),
    players: options.players,
  });
}

/** Cria a partida já na contagem da rodada 1 (emite `rodada.contagem`). */
export function createMatch(options: MatchOptions, out: GameEvent[] = []): Match {
  const match: Match = {
    options,
    phase: 'countdown',
    round: 1,
    phaseTicks: options.matchRules.countdownTicks,
    clockTicks: options.matchRules.roundTicks,
    wins: new Array<number>(options.players).fill(0),
    heldDirs: new Array<Direction | null>(options.players).fill(null),
    world: roundWorld(options, 1),
    winnerId: null,
  };
  out.push({ type: 'rodada.contagem', round: 1 });
  return match;
}

/**
 * Avança a partida um tick: contagem → jogo → espera de fim → próxima rodada (ou fim).
 * Os eventos do tick (da partida e do mundo) são acrescentados em `out`.
 */
export function stepMatch(
  match: Match,
  commands: readonly Command[],
  out: GameEvent[] = [],
): GameEvent[] {
  if (match.phase === 'over') return out;

  for (const cmd of commands) {
    if (cmd.type === 'move' && cmd.playerId >= 0 && cmd.playerId < match.heldDirs.length) {
      match.heldDirs[cmd.playerId] = cmd.dir;
    }
  }

  if (match.phase === 'countdown') {
    match.phaseTicks--;
    if (match.phaseTicks <= 0) startPlaying(match, out);
    return out;
  }

  step(match.world, commands, out);
  match.clockTicks = Math.max(0, match.clockTicks - 1);
  const alive = match.world.players.filter((p) => p.alive);

  if (match.phase === 'playing') {
    if (alive.length <= 1) {
      match.phase = 'ending';
      match.phaseTicks = match.options.matchRules.roundEndDelayTicks;
    } else if (match.clockTicks === 0) {
      endRound(match, null, out);
    }
    return out;
  }

  // ending
  match.phaseTicks--;
  if (match.phaseTicks <= 0)
    endRound(match, alive.length === 1 ? (alive[0]?.id ?? null) : null, out);
  return out;
}

function startPlaying(match: Match, out: GameEvent[]): void {
  match.phase = 'playing';
  for (const p of match.world.players) p.moveDir = match.heldDirs[p.id] ?? null;
  out.push({ type: 'rodada.iniciou', round: match.round });
}

function endRound(match: Match, winnerId: number | null, out: GameEvent[]): void {
  if (winnerId !== null) match.wins[winnerId] = (match.wins[winnerId] ?? 0) + 1;
  out.push({ type: 'rodada.terminou', round: match.round, winnerId, wins: [...match.wins] });

  if (winnerId !== null && (match.wins[winnerId] ?? 0) >= match.options.matchRules.winsToWin) {
    match.phase = 'over';
    match.winnerId = winnerId;
    out.push({ type: 'partida.terminou', winnerId, wins: [...match.wins] });
    return;
  }

  match.round++;
  match.world = roundWorld(match.options, match.round);
  match.phase = 'countdown';
  match.phaseTicks = match.options.matchRules.countdownTicks;
  match.clockTicks = match.options.matchRules.roundTicks;
  out.push({ type: 'rodada.contagem', round: match.round });
}
