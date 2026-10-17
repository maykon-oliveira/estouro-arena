import { describe, expect, it } from 'vitest';
import { msToTicks } from '../../src/core/time';

describe('msToTicks', () => {
  it('converte o pavio de 2,5 s em 150 ticks a 60/s', () => {
    expect(msToTicks(2500, 60)).toBe(150);
  });

  it('arredonda para o tick mais próximo', () => {
    expect(msToTicks(10, 60)).toBe(1); // 0,6 tick
    expect(msToTicks(5, 60)).toBe(0); // 0,3 tick
  });

  it('zero ms são zero ticks', () => {
    expect(msToTicks(0, 60)).toBe(0);
  });
});
