import { msToTicks } from '../core/time';
import type { MatchRules } from '../core/match';
import type { Rules } from '../core/world';
import type { GameConfig } from './schemas';

/** Converte a config validada (game.json) nas regras da simulação, com durações em ticks. */
export function rulesFromConfig(cfg: GameConfig): Rules {
  return {
    tickRate: cfg.tickRate,
    playerSpeed: cfg.player.speedTilesPerSecond,
    cornerAssistTiles: cfg.player.cornerAssistTiles,
    spawnSafeRadius: cfg.map.spawnSafeRadius,
    fuseTicks: msToTicks(cfg.bomb.fuseMs, cfg.tickRate),
    explosionTicks: msToTicks(cfg.bomb.explosionMs, cfg.tickRate),
    startBombs: cfg.player.startBombs,
    startRange: cfg.player.startRange,
  };
}

/** Regras da partida (melhor de 3, relógio, contagem), com durações em ticks. */
export function matchRulesFromConfig(cfg: GameConfig): MatchRules {
  return {
    winsToWin: cfg.match.winsToWin,
    roundTicks: msToTicks(cfg.match.roundMs, cfg.tickRate),
    countdownTicks: msToTicks(cfg.match.countdownMs, cfg.tickRate),
    roundEndDelayTicks: msToTicks(cfg.match.roundEndDelayMs, cfg.tickRate),
  };
}
