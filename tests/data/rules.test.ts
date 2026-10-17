import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/data';
import { rulesFromConfig } from '../../src/data/rules';

describe('rulesFromConfig', () => {
  it('converte as durações de ms para ticks', () => {
    const rules = rulesFromConfig({
      ...gameConfig,
      bomb: { fuseMs: 2500, explosionMs: 500 },
    });
    expect(rules.fuseTicks).toBe(150);
    expect(rules.explosionTicks).toBe(30);
  });

  it('copia atributos iniciais do jogador', () => {
    const rules = rulesFromConfig(gameConfig);
    expect(rules.startBombs).toBe(gameConfig.player.startBombs);
    expect(rules.startRange).toBe(gameConfig.player.startRange);
  });
});

describe('botConfigs', () => {
  it('carrega os 3 níveis de src/data/bots.json com durações em ticks', async () => {
    const { botConfigs } = await import('../../src/data');
    expect([...botConfigs.keys()]).toEqual(['facil', 'medio', 'dificil']);
    expect(botConfigs.get('medio')?.level.reactionTicks).toBe(15);
    expect(botConfigs.get('dificil')?.level.mistakeChance).toBe(0);
    expect(botConfigs.get('facil')?.escapeMarginTicks).toBe(9);
  });
});
