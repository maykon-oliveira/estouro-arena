import type { Command } from '../core/commands';
import type { Direction } from '../core/direction';

export interface DirectionSource {
  current(): Direction | null;
}

/** Fonte de ações pontuais (apertou uma vez = uma ação). */
export interface ActionSource {
  /** Devolve true uma vez por pedido de bomba pendente, e o consome. */
  takeBomb(): boolean;
}

/**
 * Junta as fontes de entrada de um jogador (joystick, teclado, gamepad) e gera comandos.
 * Direção: a primeira fonte com direção vence; só emite `move` quando muda.
 * Bomba: qualquer fonte com pedido pendente gera um `bomb`.
 */
export class PlayerInput {
  private lastSent: Direction | null = null;

  constructor(
    private readonly playerId: number,
    private readonly directions: readonly DirectionSource[],
    private readonly actions: readonly ActionSource[] = [],
  ) {}

  poll(out: Command[]): void {
    let dir: Direction | null = null;
    for (const source of this.directions) {
      dir = source.current();
      if (dir !== null) break;
    }
    if (dir !== this.lastSent) {
      this.lastSent = dir;
      out.push({ type: 'move', playerId: this.playerId, dir });
    }

    let bomb = false;
    // Consome todas as fontes, para um pedido antigo não vazar para depois.
    for (const source of this.actions) bomb = source.takeBomb() || bomb;
    if (bomb) out.push({ type: 'bomb', playerId: this.playerId });
  }
}

/** Pedido de bomba pendente, preenchido por eventos do DOM. */
export class BombTrigger implements ActionSource {
  private pending = false;

  trigger(): void {
    this.pending = true;
  }

  takeBomb(): boolean {
    const was = this.pending;
    this.pending = false;
    return was;
  }
}
