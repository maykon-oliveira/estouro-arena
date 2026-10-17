import { msToTicks } from '../core/time';
import type { BotConfig } from '../core/bots/bot';
import type { MatchRules } from '../core/match';
import type { MountDef } from '../core/mounts';
import type { Rules } from '../core/world';
import type { BotsData, GameConfig, MountData } from './schemas';

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
    maxBombs: cfg.player.maxBombs,
    maxRange: cfg.player.maxRange,
    speedStep: cfg.player.speedStep,
    maxSpeedLevel: cfg.player.maxSpeedLevel,
    kickSpeed: cfg.bomb.kickSpeedTilesPerSecond,
    mountInvulnerableTicks: msToTicks(cfg.mount.invulnerableMs, cfg.tickRate),
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

/** Nível de bot por id (`facil`, `medio`, `dificil`), com durações em ticks. */
export function botConfigsFromData(data: BotsData, tickRate: number): Map<string, BotConfig> {
  const escapeMarginTicks = msToTicks(data.escapeMarginMs, tickRate);
  return new Map(
    Object.entries(data.levels).map(([id, level]) => [
      id,
      {
        escapeMarginTicks,
        level: {
          reactionTicks: Math.max(1, msToTicks(level.reactionMs, tickRate)),
          mistakeChance: level.mistakeChance,
          aggression: level.aggression,
          itemSearchTiles: level.itemSearchTiles,
        },
      },
    ]),
  );
}

/** Montaria com durações em ticks (pulo e recarga do sapo). */
export function mountDefFromData(data: MountData, tickRate: number): MountDef {
  if (data.ability === null) return data;
  return {
    id: data.id,
    ability: 'jump',
    jumpTiles: data.jumpTiles,
    jumpTicks: Math.max(1, msToTicks(data.jumpMs, tickRate)),
    cooldownTicks: msToTicks(data.cooldownMs, tickRate),
    terrainOverrides: data.terrainOverrides,
  };
}
