import type { Command } from '../core/commands';
import type { Direction } from '../core/direction';

export interface DirectionSource {
  current(): Direction | null;
}

/**
 * Junta as fontes de direção de um jogador (joystick, teclado, gamepad) e gera comandos.
 * A primeira fonte com direção vence; só emite `move` quando a direção muda.
 */
export class PlayerInput {
  private lastSent: Direction | null = null;

  constructor(
    private readonly playerId: number,
    private readonly sources: readonly DirectionSource[],
  ) {}

  poll(out: Command[]): void {
    let dir: Direction | null = null;
    for (const source of this.sources) {
      dir = source.current();
      if (dir !== null) break;
    }
    if (dir === this.lastSent) return;
    this.lastSent = dir;
    out.push({ type: 'move', playerId: this.playerId, dir });
  }
}
