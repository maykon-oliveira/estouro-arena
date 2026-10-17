import { describe, expect, it } from 'vitest';
import { gameConfig, terrains } from '../../src/data';

describe('carga do conteúdo', () => {
  it('expõe os terrenos por id', () => {
    expect(terrains.get('parede')?.blocksFire).toBe(true);
    expect(terrains.get('bloco')?.destructible).toBe(true);
  });

  it('expõe a config do jogo', () => {
    expect(gameConfig.tickRate).toBe(60);
  });
});
