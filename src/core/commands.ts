import type { Direction } from './direction';

/** Direção segurada pelo jogador; `null` = soltou o controle. Vale até o próximo comando. */
export interface MoveCommand {
  type: 'move';
  playerId: number;
  dir: Direction | null;
}

/** Solta uma bomba no tile do jogador (se puder). */
export interface BombCommand {
  type: 'bomb';
  playerId: number;
}

/** Painel de debug (`?debug=1`): põe um item no tile do jogador. */
export interface DebugItemCommand {
  type: 'debugItem';
  playerId: number;
  itemId: string;
}

/** Tudo que a entrada (teclado, joystick, bot, rede, debug) pode pedir à simulação. */
export type Command = MoveCommand | BombCommand | DebugItemCommand;
