import type { Command } from '../core/commands';
import type { Direction } from '../core/direction';
import { DirectionStack } from './DirectionStack';

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

/** Teclado (setas e WASD) → comandos de movimento para um jogador. */
export class KeyboardInput {
  private readonly stack = new DirectionStack();
  private lastSent: Direction | null = null;

  constructor(
    private readonly playerId: number,
    target: Window = window,
  ) {
    target.addEventListener('keydown', (e) => this.onKey(e, true));
    target.addEventListener('keyup', (e) => this.onKey(e, false));
    // Sem isso, a tecla fica "presa" se o keyup acontecer fora da janela.
    target.addEventListener('blur', () => this.stack.clear());
  }

  /** Comandos desde a última chamada (só quando a direção muda). */
  poll(out: Command[]): void {
    const dir = this.stack.current();
    if (dir === this.lastSent) return;
    this.lastSent = dir;
    out.push({ type: 'move', playerId: this.playerId, dir });
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const dir = KEY_DIRECTIONS[e.code];
    if (!dir) return;
    e.preventDefault();
    if (down) this.stack.press(dir);
    else this.stack.release(dir);
  }
}
