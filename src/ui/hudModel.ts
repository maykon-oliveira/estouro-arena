import { t, type StringKey } from '../data';

const PLAYER_NAME_KEYS = [
  'player.color.0',
  'player.color.1',
  'player.color.2',
  'player.color.3',
] as const satisfies readonly StringKey[];

/** Relógio `m:ss`, arredondando os segundos para cima (começa em 2:00, chega a 0:00 só no fim). */
export function formatClock(ticks: number, tickRate: number): string {
  const seconds = Math.max(0, Math.ceil(ticks / tickRate));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Número da contagem ("3", "2", "1") a partir dos ticks restantes. */
export function countdownLabel(ticks: number, tickRate: number): string {
  return Math.max(1, Math.ceil(ticks / tickRate)).toString();
}

/** Nome do personagem (`character.<id>.name`). */
export function characterName(characterId: string): string {
  return t(`character.${characterId}.name` as StringKey);
}

/** Passiva do personagem em uma linha (`character.<id>.passive`). */
export function characterPassive(characterId: string): string {
  return t(`character.${characterId}.passive` as StringKey);
}

/**
 * Nome do jogador: o do personagem, se tiver; senão, pela cor do lugar ("Vermelho", "Azul"…).
 * `characters` é o personagem de cada jogador (índice = id).
 */
export function playerName(id: number, characters: readonly (string | null)[] = []): string {
  const character = characters[id];
  if (character) return characterName(character);
  const key = PLAYER_NAME_KEYS[id];
  return key ? t(key) : `#${id + 1}`;
}

/** Aviso de fim de rodada: vencedor ou empate. */
export function roundEndText(
  winnerId: number | null,
  characters: readonly (string | null)[] = [],
): string {
  return winnerId === null
    ? t('round.draw')
    : t('round.win', { player: playerName(winnerId, characters) });
}
