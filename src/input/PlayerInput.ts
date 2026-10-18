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

/** Fontes dos botões pequenos: remota, montaria e especial. */
export interface ActionSources {
  remote?: readonly PressSource[];
  mount?: readonly PressSource[];
  special?: readonly PressSource[];
}

/**
 * Junta as fontes de entrada de um jogador (joystick, teclado, gamepad) e gera comandos.
 * Direção: a primeira fonte com direção vence; só emite `move` quando muda.
 * Botões: qualquer fonte com pedido pendente gera um comando, nesta ordem: `bomb`, `remote`,
 * `mount`, `special`.
 */
export class PlayerInput {
  private lastSent: Direction | null = null;

  constructor(
    private readonly playerId: number,
    private readonly directions: readonly DirectionSource[],
    private readonly bombs: readonly PressSource[] = [],
    private readonly actions: ActionSources = {},
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

    const playerId = this.playerId;
    if (takeAny(this.bombs)) out.push({ type: 'bomb', playerId });
    if (takeAny(this.actions.remote ?? [])) out.push({ type: 'remote', playerId });
    if (takeAny(this.actions.mount ?? [])) out.push({ type: 'mount', playerId });
    if (takeAny(this.actions.special ?? [])) out.push({ type: 'special', playerId });
  }
}

/** Consome todas as fontes (um pedido antigo não vaza para depois); true se alguma tinha pedido. */
function takeAny(sources: readonly PressSource[]): boolean {
  let any = false;
  for (const source of sources) any = source.take() || any;
  return any;
}

/** Pedido pendente (bomba ou botão pequeno), preenchido por eventos do DOM. */
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
