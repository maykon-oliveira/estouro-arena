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

const BOMB_KEYS: ReadonlySet<string> = new Set(['Space']);
const ACTION_KEYS: ReadonlySet<string> = new Set(['ShiftLeft', 'ShiftRight', 'KeyK']);

/** Teclado: setas/WASD para andar, espaço para bomba, Shift ou K para ação. */
export class KeyboardInput implements DirectionSource {
  private readonly stack = new DirectionStack();
  /** Pedidos de bomba (espaço) e de ação (Shift ou K), para o `PlayerInput`. */
  readonly bomb = new PressTrigger();
  readonly action = new PressTrigger();

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
    const press = BOMB_KEYS.has(e.code) ? this.bomb : ACTION_KEYS.has(e.code) ? this.action : null;
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
