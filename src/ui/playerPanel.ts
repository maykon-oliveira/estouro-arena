import type { Player } from '../core/world';
import { t, type StringKey } from '../data';
import { playerName } from './hudModel';

/** Rótulo de cada habilidade e montaria no painel (só as que o jogador tem aparecem). */
const LABELS: Readonly<Record<string, StringKey>> = {
  chute: 'hud.ability.chute',
  remota: 'hud.ability.remota',
  perfurante: 'hud.ability.perfurante',
  atravessa_bloco: 'hud.ability.atravessa_bloco',
  capivara: 'hud.mount.capivara',
  sapo_saltador: 'hud.mount.sapo_saltador',
};

/** Ordem fixa das habilidades no painel. */
const ABILITY_ORDER = ['chute', 'remota', 'perfurante', 'atravessa_bloco'];

/** Textos do painel do jogador local (bombas, alcance, patins, habilidades, montaria, fantasma). */
export function panelChips(player: Player): string[] {
  if (!player.alive) {
    if (!player.ghost) return [t('hud.out')];
    return [t(player.ghost.thrown ? 'hud.ghost.used' : 'hud.ghost.ready')];
  }
  const chips = [`💣 ${player.maxBombs}`, `🔥 ${player.range}`];
  if (player.speedLevel > 0) chips.push(`👟 ${player.speedLevel}`);
  for (const id of ABILITY_ORDER) {
    const key = LABELS[id];
    if (player.abilities.has(id) && key) chips.push(t(key));
  }
  const mountKey = player.mount === null ? undefined : LABELS[player.mount];
  if (mountKey) chips.push(t(mountKey));
  return chips;
}

/** Título da tela de Resultado. */
export function resultTitle(winnerId: number): string {
  return winnerId === 0 ? t('result.you_win') : t('result.win', { player: playerName(winnerId) });
}
