import type { Direction } from '../core/direction';
import { DirectionStack } from './DirectionStack';
import { BombTrigger, type ActionSource, type DirectionSource } from './PlayerInput';

const KEY_DIRECTIONS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

const BOMB_KEYS: ReadonlySet<string> = new Set(['Space']);

/** Teclado: setas/WASD para andar, espaço para bomba. */
export class KeyboardInput implements DirectionSource, ActionSource {
  private readonly stack = new DirectionStack();
  private readonly bomb = new BombTrigger();

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => this.onKey(e, true));
    target.addEventListener('keyup', (e) => this.onKey(e, false));
    // Sem isso, a tecla fica "presa" se o keyup acontecer fora da janela.
    target.addEventListener('blur', () => this.stack.clear());
  }

  current(): Direction | null {
    return this.stack.current();
  }

  takeBomb(): boolean {
    return this.bomb.takeBomb();
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    if (BOMB_KEYS.has(e.code)) {
      e.preventDefault();
      // Segurar a tecla não solta várias bombas (ignora auto-repeat).
      if (down && !e.repeat) this.bomb.trigger();
      return;
    }
    const dir = KEY_DIRECTIONS[e.code];
    if (!dir) return;
    e.preventDefault();
    if (down) this.stack.press(dir);
    else this.stack.release(dir);
  }
}
