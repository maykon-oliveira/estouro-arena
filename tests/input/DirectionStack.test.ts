import { describe, expect, it } from 'vitest';
import { DirectionStack } from '../../src/input/DirectionStack';

describe('DirectionStack', () => {
  it('começa sem direção', () => {
    expect(new DirectionStack().current()).toBeNull();
  });

  it('vale a última tecla pressionada', () => {
    const s = new DirectionStack();
    s.press('right');
    s.press('up');
    expect(s.current()).toBe('up');
  });

  it('ao soltar a última, volta para a anterior ainda segurada', () => {
    const s = new DirectionStack();
    s.press('right');
    s.press('up');
    s.release('up');
    expect(s.current()).toBe('right');
  });

  it('soltar uma tecla antiga não muda a atual', () => {
    const s = new DirectionStack();
    s.press('right');
    s.press('up');
    s.release('right');
    expect(s.current()).toBe('up');
  });

  it('repetição de tecla (auto-repeat) não duplica', () => {
    const s = new DirectionStack();
    s.press('right');
    s.press('right');
    s.release('right');
    expect(s.current()).toBeNull();
  });

  it('clear solta tudo', () => {
    const s = new DirectionStack();
    s.press('left');
    s.clear();
    expect(s.current()).toBeNull();
  });
});
