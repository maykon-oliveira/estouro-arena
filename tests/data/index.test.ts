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

describe('textos', () => {
  it('t() devolve o texto em português', async () => {
    const { t } = await import('../../src/data');
    expect(t('rotate_warning')).toBe('Gire o aparelho para jogar');
  });
});
