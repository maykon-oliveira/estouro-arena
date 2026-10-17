import { describe, expect, it } from 'vitest';
import type { Command } from '../../src/core/commands';
import type { Direction } from '../../src/core/direction';
import { PlayerInput, type DirectionSource } from '../../src/input/PlayerInput';

class FakeSource implements DirectionSource {
  dir: Direction | null = null;
  current(): Direction | null {
    return this.dir;
  }
}

function setup() {
  const joystick = new FakeSource();
  const keyboard = new FakeSource();
  const input = new PlayerInput(3, [joystick, keyboard]);
  const poll = (): Command[] => {
    const out: Command[] = [];
    input.poll(out);
    return out;
  };
  return { joystick, keyboard, poll };
}

describe('PlayerInput', () => {
  it('não emite nada enquanto nada muda', () => {
    const { poll } = setup();
    expect(poll()).toEqual([]);
  });

  it('emite move quando a direção muda, uma vez só', () => {
    const { keyboard, poll } = setup();
    keyboard.dir = 'left';
    expect(poll()).toEqual([{ type: 'move', playerId: 3, dir: 'left' }]);
    expect(poll()).toEqual([]);
  });

  it('a primeira fonte ativa tem prioridade', () => {
    const { joystick, keyboard, poll } = setup();
    keyboard.dir = 'left';
    joystick.dir = 'up';
    expect(poll()).toEqual([{ type: 'move', playerId: 3, dir: 'up' }]);
    joystick.dir = null;
    expect(poll()).toEqual([{ type: 'move', playerId: 3, dir: 'left' }]);
  });

  it('emite direção nula ao soltar tudo', () => {
    const { joystick, poll } = setup();
    joystick.dir = 'down';
    poll();
    joystick.dir = null;
    expect(poll()).toEqual([{ type: 'move', playerId: 3, dir: null }]);
  });
});
