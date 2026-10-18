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

/** Detona a bomba remota mais antiga do jogador. */
export interface RemoteCommand {
  type: 'remote';
  playerId: number;
}

/** Habilidade da montaria (pulo do sapo). */
export interface MountCommand {
  type: 'mount';
  playerId: number;
}

/** Especial do personagem (com a barra de energia cheia). */
export interface SpecialCommand {
  type: 'special';
  playerId: number;
}

/** Painel de debug (`?debug=1`): põe um item no tile do jogador. */
export interface DebugItemCommand {
  type: 'debugItem';
  playerId: number;
  itemId: string;
}

/** Painel de debug (`?debug=1`): enche a barra de energia do jogador. */
export interface DebugEnergyCommand {
  type: 'debugEnergy';
  playerId: number;
}

/** Tudo que a entrada (teclado, joystick, bot, rede, debug) pode pedir à simulação. */
export type Command =
  | MoveCommand
  | BombCommand
  | RemoteCommand
  | MountCommand
  | SpecialCommand
  | DebugItemCommand
  | DebugEnergyCommand;
