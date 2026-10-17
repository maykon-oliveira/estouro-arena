import type { Direction } from './direction';

/** Direção segurada pelo jogador; `null` = soltou o controle. Vale até o próximo comando. */
export interface MoveCommand {
  type: 'move';
  playerId: number;
  dir: Direction | null;
}

/** Tudo que a entrada (teclado, joystick, bot, rede) pode pedir à simulação. */
export type Command = MoveCommand;
