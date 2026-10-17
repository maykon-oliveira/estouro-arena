import { describe, expect, it } from 'vitest';
import type { Command } from '../../src/core/commands';
import type { Direction } from '../../src/core/direction';
import { BombTrigger, PlayerInput, type DirectionSource } from '../../src/input/PlayerInput';

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

describe('PlayerInput — bomba', () => {
  it('emite bomb uma vez por pedido', () => {
    const trigger = new BombTrigger();
    const input = new PlayerInput(1, [], [trigger]);
    const poll = (): Command[] => {
      const out: Command[] = [];
      input.poll(out);
      return out;
    };
    trigger.trigger();
    expect(poll()).toEqual([{ type: 'bomb', playerId: 1 }]);
    expect(poll()).toEqual([]);
  });

  it('vários pedidos de fontes diferentes no mesmo quadro viram um comando', () => {
    const a = new BombTrigger();
    const b = new BombTrigger();
    const input = new PlayerInput(0, [], [a, b]);
    a.trigger();
    b.trigger();
    const out: Command[] = [];
    input.poll(out);
    expect(out).toEqual([{ type: 'bomb', playerId: 0 }]);
    expect(b.takeBomb()).toBe(false); // consumido
  });

  it('move vem antes de bomb no mesmo quadro', () => {
    const dirs = new FakeSource();
    const trigger = new BombTrigger();
    const input = new PlayerInput(0, [dirs], [trigger]);
    dirs.dir = 'up';
    trigger.trigger();
    const out: Command[] = [];
    input.poll(out);
    expect(out.map((c) => c.type)).toEqual(['move', 'bomb']);
  });
});
