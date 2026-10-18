import { msToTicks } from '../core/time';
import type { BotConfig } from '../core/bots/bot';
import type { MatchRules } from '../core/match';
import type { MountDef } from '../core/mounts';
import type { CharacterDef } from '../core/characters';
import type { SpecialDef } from '../core/specials';
import type { Rules } from '../core/world';
import type { BotsData, CharacterData, GameConfig, MountData, SpecialData } from './schemas';

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
    shieldInvulnerableTicks: msToTicks(cfg.character.shieldInvulnerableMs, cfg.tickRate),
    energyMax: cfg.energy.max,
    energyPerBlock: cfg.energy.perBlock,
    energyPerKnockout: cfg.energy.perKnockout,
    energyPerSecond: cfg.energy.perSecond,
    ghostDelayTicks: msToTicks(cfg.ghost.delayMs, cfg.tickRate),
    ghostSpeed: cfg.ghost.speedTilesPerSecond,
    ghostThrowTiles: cfg.ghost.throwTiles,
    ghostFlightTicks: Math.max(1, msToTicks(cfg.ghost.flightMs, cfg.tickRate)),
  };
}

/** Regras da partida (melhor de 3, relógio, contagem), com durações em ticks. */
export function matchRulesFromConfig(cfg: GameConfig): MatchRules {
  return {
    winsToWin: cfg.match.winsToWin,
    roundTicks: msToTicks(cfg.match.roundMs, cfg.tickRate),
    countdownTicks: msToTicks(cfg.match.countdownMs, cfg.tickRate),
    roundEndDelayTicks: msToTicks(cfg.match.roundEndDelayMs, cfg.tickRate),
    suddenDeathTicks: msToTicks(cfg.suddenDeath.durationMs, cfg.tickRate),
  };
}

/** Nível de bot por id (`facil`, `medio`, `dificil`), com durações em ticks. */
export function botConfigsFromData(data: BotsData, tickRate: number): Map<string, BotConfig> {
  const escapeMarginTicks = msToTicks(data.escapeMarginMs, tickRate);
  const collapseHorizonTicks = msToTicks(data.collapseHorizonMs, tickRate);
  return new Map(
    Object.entries(data.levels).map(([id, level]) => [
      id,
      {
        escapeMarginTicks,
        collapseHorizonTicks,
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

/** Especial com durações em ticks. */
export function specialDefFromData(data: SpecialData, tickRate: number): SpecialDef {
  switch (data.type) {
    case 'teleport':
      return data;
    case 'charm':
      return { type: 'charm', durationTicks: Math.max(1, msToTicks(data.durationMs, tickRate)) };
    case 'dash':
      return {
        type: 'dash',
        tiles: data.tiles,
        ticksPerTile: Math.max(1, Math.round(tickRate / data.speedTilesPerSecond)),
      };
  }
}

/** Personagem com o especial em ticks. */
export function characterDefFromData(data: CharacterData, tickRate: number): CharacterDef {
  const { special, ...rest } = data;
  return special ? { ...rest, special: specialDefFromData(special, tickRate) } : rest;
}
