import type { Direction } from '../core/direction';
import { DirectionStack } from './DirectionStack';
import { PressTrigger, type DirectionSource } from './PlayerInput';

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

/** Teclado: setas/WASD para andar, espaço bomba, K remota, J montaria, L especial. */
export class KeyboardInput implements DirectionSource {
  private readonly stack = new DirectionStack();
  /** Pedidos de cada botão, para o `PlayerInput`. */
  readonly bomb = new PressTrigger();
  readonly remote = new PressTrigger();
  readonly mount = new PressTrigger();
  readonly special = new PressTrigger();
  private readonly presses: Readonly<Record<string, PressTrigger>> = {
    Space: this.bomb,
    KeyK: this.remote,
    KeyJ: this.mount,
    KeyL: this.special,
  };

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
    const press = this.presses[e.code];
    if (press) {
      e.preventDefault();
      // Segurar a tecla não repete o pedido (ignora auto-repeat).
      if (down && !e.repeat) press.trigger();
      return;
    }
    const dir = KEY_DIRECTIONS[e.code];
    if (!dir) return;
    e.preventDefault();
    if (down) this.stack.press(dir);
    else this.stack.release(dir);
  }
}
