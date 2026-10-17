import type { Direction } from '../core/direction';
import { DirectionStack } from './DirectionStack';
import type { DirectionSource } from './PlayerInput';

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

/** Teclado (setas e WASD) como fonte de direção. */
export class KeyboardInput implements DirectionSource {
  private readonly stack = new DirectionStack();

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => this.onKey(e, true));
    target.addEventListener('keyup', (e) => this.onKey(e, false));
    // Sem isso, a tecla fica "presa" se o keyup acontecer fora da janela.
    target.addEventListener('blur', () => this.stack.clear());
  }

  current(): Direction | null {
    return this.stack.current();
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const dir = KEY_DIRECTIONS[e.code];
    if (!dir) return;
    e.preventDefault();
    if (down) this.stack.press(dir);
    else this.stack.release(dir);
  }
}
