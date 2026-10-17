import { describe, expect, it } from 'vitest';
import { clampToRadius, directionFromVector } from '../../src/input/joystickMath';

const opts = { radius: 60, deadZone: 0.25, hysteresis: 0.2 };

describe('directionFromVector', () => {
  it('dentro da zona morta não há direção', () => {
    expect(directionFromVector(10, 5, null, opts)).toBeNull(); // 11 px < 15 px
  });

  it('escolhe o eixo dominante', () => {
    expect(directionFromVector(40, 10, null, opts)).toBe('right');
    expect(directionFromVector(-40, 10, null, opts)).toBe('left');
    expect(directionFromVector(5, -40, null, opts)).toBe('up');
    expect(directionFromVector(5, 40, null, opts)).toBe('down');
  });

  it('com histerese, mantém a direção atual perto da diagonal', () => {
    // dy é 10% maior que dx: sem direção atual vira "down", mas segurando "right" continua "right".
    expect(directionFromVector(40, 44, null, opts)).toBe('down');
    expect(directionFromVector(40, 44, 'right', opts)).toBe('right');
  });

  it('troca de direção quando o outro eixo supera a histerese', () => {
    expect(directionFromVector(40, 50, 'right', opts)).toBe('down'); // 25% maior
  });

  it('a direção atual só é mantida se o sinal do eixo bate', () => {
    expect(directionFromVector(-40, 44, 'right', opts)).toBe('down');
  });

  it('vetor nulo não tem direção', () => {
    expect(directionFromVector(0, 0, 'up', opts)).toBeNull();
  });
});

describe('clampToRadius', () => {
  it('mantém vetores dentro do raio', () => {
    expect(clampToRadius(30, 40, 60)).toEqual({ x: 30, y: 40 });
  });

  it('encurta vetores fora do raio mantendo a direção', () => {
    const v = clampToRadius(60, 80, 50); // comprimento 100 → 50
    expect(v.x).toBeCloseTo(30);
    expect(v.y).toBeCloseTo(40);
  });
});
