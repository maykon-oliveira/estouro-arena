import { describe, expect, it } from 'vitest';
import { createFixedStep } from '../../src/core/fixedStep';

describe('createFixedStep', () => {
  it('1 segundo a 60/s rende 60 ticks', () => {
    const stepper = createFixedStep(60, 100);
    expect(stepper.advance(1000)).toBe(60);
  });

  it('acumula frações entre quadros', () => {
    const stepper = createFixedStep(60, 5);
    expect(stepper.advance(10)).toBe(0); // 0,6 tick
    expect(stepper.advance(10)).toBe(1); // 1,2 tick
    expect(stepper.advance(10)).toBe(0); // 0,2 + 0,6 = 0,8 tick
    expect(stepper.advance(10)).toBe(1); // 1,4 tick
  });

  it('limita ticks por quadro e descarta o atraso', () => {
    const stepper = createFixedStep(60, 5);
    expect(stepper.advance(5000)).toBe(5);
    expect(stepper.advance(0)).toBe(0);
  });

  it('ignora delta negativo', () => {
    const stepper = createFixedStep(60, 5);
    expect(stepper.advance(-100)).toBe(0);
  });
});
