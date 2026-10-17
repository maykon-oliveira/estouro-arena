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
