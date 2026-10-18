import { specialOf } from '../core/specials';
import type { World } from '../core/world';
import type { ButtonState, SmallButton } from '../input/TouchControls';

/** Estado dos botões pequenos do jogador e quanto da barra de energia está cheio (0 a 1). */
export interface ButtonsView {
  states: Record<SmallButton, ButtonState>;
  specialFill: number;
}

/**
 * Cada botão só aparece quando o jogador tem aquilo (remota, montaria com habilidade,
 * personagem com especial); aparece esmaecido quando tem, mas não dá agora.
 * Morto (fantasma) ou fora da rodada: todos escondidos (o fantasma arremessa com a bomba).
 */
export function buttonsView(world: World, playerId: number): ButtonsView {
  const player = world.players[playerId];
  if (!player?.alive) {
    return { states: { remote: 'hidden', mount: 'hidden', special: 'hidden' }, specialFill: 0 };
  }
  const busy = player.jump !== null || player.dash !== null;

  let remote: ButtonState = 'hidden';
  if (player.abilities.has('remota')) {
    const placed = world.bombs.some((b) => b.remote === true && b.ownerId === playerId);
    remote = placed ? 'ready' : 'dim';
  }

  let mount: ButtonState = 'hidden';
  const mountDef = player.mount === null ? undefined : world.mountDefs.get(player.mount);
  if (mountDef && mountDef.ability !== null) {
    mount = player.abilityCooldown === 0 && !busy ? 'ready' : 'dim';
  }

  let special: ButtonState = 'hidden';
  const { energyMax } = world.rules;
  if (specialOf(world, player)) {
    special = player.energy >= energyMax && !busy ? 'ready' : 'dim';
  }

  return { states: { remote, mount, special }, specialFill: player.energy / energyMax };
}
