import { describe, expect, it } from 'vitest';
import { GameConfigSchema, TerrainsSchema, parseContent } from '../../src/data/schemas';
import gameJson from '../../src/data/game.json';
import terrainsJson from '../../src/data/terrains.json';

const baseTerrains = [
  {
    id: 'chao',
    walkable: true,
    blocksFire: false,
    destructible: false,
    allowsBomb: true,
    speedMultiplier: 1,
  },
  {
    id: 'parede',
    walkable: false,
    blocksFire: true,
    destructible: false,
    allowsBomb: false,
    speedMultiplier: 1,
  },
  {
    id: 'bloco',
    walkable: false,
    blocksFire: true,
    destructible: true,
    allowsBomb: false,
    speedMultiplier: 1,
  },
];

describe('arquivos de dados reais', () => {
  it('game.json é válido', () => {
    expect(GameConfigSchema.safeParse(gameJson).success).toBe(true);
  });

  it('terrains.json é válido', () => {
    expect(TerrainsSchema.safeParse(terrainsJson).success).toBe(true);
  });
});

describe('TerrainsSchema', () => {
  it('aceita os terrenos básicos', () => {
    expect(TerrainsSchema.safeParse(baseTerrains).success).toBe(true);
  });

  it('rejeita id duplicado', () => {
    const dup = [...baseTerrains, { ...baseTerrains[0] }];
    expect(TerrainsSchema.safeParse(dup).success).toBe(false);
  });

  it('rejeita id fora de snake_case', () => {
    const bad = [...baseTerrains, { ...baseTerrains[0], id: 'AguaRasa' }];
    expect(TerrainsSchema.safeParse(bad).success).toBe(false);
  });

  it('exige chao, parede e bloco', () => {
    expect(TerrainsSchema.safeParse(baseTerrains.slice(0, 2)).success).toBe(false);
  });

  it('rejeita campo desconhecido (erro de digitação)', () => {
    const typo = [{ ...baseTerrains[0], walkabel: true }, ...baseTerrains.slice(1)];
    expect(TerrainsSchema.safeParse(typo).success).toBe(false);
  });

  it('rejeita multiplicador de velocidade negativo', () => {
    const bad = [{ ...baseTerrains[0], speedMultiplier: -1 }, ...baseTerrains.slice(1)];
    expect(TerrainsSchema.safeParse(bad).success).toBe(false);
  });
});

describe('GameConfigSchema', () => {
  it('rejeita pavio menor que um tick', () => {
    const bad = { ...gameJson, bomb: { ...gameJson.bomb, fuseMs: 5 } };
    expect(GameConfigSchema.safeParse(bad).success).toBe(false);
  });

  it('rejeita grade fracionária ou pequena demais', () => {
    expect(
      GameConfigSchema.safeParse({ ...gameJson, grid: { cols: 15.5, rows: 13 } }).success,
    ).toBe(false);
    expect(GameConfigSchema.safeParse({ ...gameJson, grid: { cols: 3, rows: 13 } }).success).toBe(
      false,
    );
  });

  it('rejeita bombas iniciais zero', () => {
    const bad = { ...gameJson, player: { ...gameJson.player, startBombs: 0 } };
    expect(GameConfigSchema.safeParse(bad).success).toBe(false);
  });
});

describe('parseContent', () => {
  it('indica o arquivo e o campo no erro', () => {
    expect(() =>
      parseContent(GameConfigSchema, { ...gameJson, tickRate: 0 }, 'src/data/game.json'),
    ).toThrow(/src\/data\/game\.json[\s\S]*tickRate/);
  });
});
