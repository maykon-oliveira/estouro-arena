import type { Command } from '../core/commands';
import type { Direction } from '../core/direction';

export interface DirectionSource {
  current(): Direction | null;
}

/** Fonte de toques pontuais (apertou uma vez = um pedido). */
export interface PressSource {
  /** Devolve true uma vez por pedido pendente, e o consome. */
  take(): boolean;
}

/**
 * Junta as fontes de entrada de um jogador (joystick, teclado, gamepad) e gera comandos.
 * Direção: a primeira fonte com direção vence; só emite `move` quando muda.
 * Bomba e ação: qualquer fonte com pedido pendente gera um `bomb` / um `action` (nessa ordem).
 */
export class PlayerInput {
  private lastSent: Direction | null = null;

  constructor(
    private readonly playerId: number,
    private readonly directions: readonly DirectionSource[],
    private readonly bombs: readonly PressSource[] = [],
    private readonly actions: readonly PressSource[] = [],
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

    if (takeAny(this.bombs)) out.push({ type: 'bomb', playerId: this.playerId });
    if (takeAny(this.actions)) out.push({ type: 'action', playerId: this.playerId });
  }
}

/** Consome todas as fontes (um pedido antigo não vaza para depois); true se alguma tinha pedido. */
function takeAny(sources: readonly PressSource[]): boolean {
  let any = false;
  for (const source of sources) any = source.take() || any;
  return any;
}

/** Pedido pendente (bomba ou ação), preenchido por eventos do DOM. */
export class PressTrigger implements PressSource {
  private pending = false;

  trigger(): void {
    this.pending = true;
  }

  take(): boolean {
    const was = this.pending;
    this.pending = false;
    return was;
  }
}
