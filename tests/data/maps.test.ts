import { describe, expect, it } from 'vitest';
import { createMapSchema } from '../../src/data/schemas';
import { maps } from '../../src/data';

const schema = createMapSchema(new Set(['chao', 'parede', 'bloco']), new Set(['bomba']));

const valid = {
  id: 'teste_01',
  bioma: 'pantanal',
  tamanho: [5, 3],
  legenda: { '#': 'parede', '.': 'chao', P: 'spawn' },
  mapa: ['#####', '#P..#', '#####'],
  blocos: { densidade: 0.5 },
};

describe('schema de mapa', () => {
  it('aceita um mapa válido', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('aceita itens e música opcionais do formato do GDD', () => {
    const full = { ...valid, blocos: { densidade: 0.6, itens: { bomba: 6 } }, musica: 'tema' };
    expect(schema.safeParse(full).success).toBe(true);
  });

  it('rejeita item que não existe no catálogo', () => {
    const bad = { ...valid, blocos: { densidade: 0.6, itens: { nao_existe: 1 } } };
    expect(schema.safeParse(bad).success).toBe(false);
  });

  it('rejeita número de linhas diferente do tamanho', () => {
    expect(schema.safeParse({ ...valid, mapa: ['#####', '#P..#'] }).success).toBe(false);
  });

  it('rejeita linha com largura errada', () => {
    expect(schema.safeParse({ ...valid, mapa: ['#####', '#P.#', '#####'] }).success).toBe(false);
  });

  it('rejeita caractere fora da legenda', () => {
    expect(schema.safeParse({ ...valid, mapa: ['#####', '#P.x#', '#####'] }).success).toBe(false);
  });

  it('rejeita legenda apontando para terreno inexistente', () => {
    const bad = { ...valid, legenda: { ...valid.legenda, '.': 'lava_azul' } };
    expect(schema.safeParse(bad).success).toBe(false);
  });

  it('rejeita mapa sem spawn', () => {
    expect(schema.safeParse({ ...valid, mapa: ['#####', '#...#', '#####'] }).success).toBe(false);
  });

  it('rejeita densidade fora de [0, 1]', () => {
    expect(schema.safeParse({ ...valid, blocos: { densidade: 1.5 } }).success).toBe(false);
  });
});

describe('mapas do jogo', () => {
  it('arena_01 está carregada', () => {
    expect(maps.get('arena_01')?.tamanho).toEqual([15, 13]);
  });
});
