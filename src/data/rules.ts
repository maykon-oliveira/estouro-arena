import { msToTicks } from '../core/time';
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
