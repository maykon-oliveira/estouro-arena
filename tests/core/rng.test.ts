import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';

describe('createRng', () => {
  it('gera a mesma sequência para a mesma seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('gera sequências diferentes para seeds diferentes', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('next() fica em [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() respeita os limites inclusivos', () => {
    const rng = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.int(1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it('retoma a sequência a partir do estado salvo', () => {
    const rng = createRng(123);
    rng.next();
    const resumed = createRng(rng.state);
    expect(resumed.next()).toBe(rng.next());
  });
});
