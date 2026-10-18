import type { TerrainOverride } from './mounts';
import { createRng } from './rng';
import type { SpecialDef } from './specials';
import type { Player, Rules } from './world';

/** Passiva do personagem (src/data/characters.json): só dados, aplicados ao nascer. */
export interface CharacterPassive {
  /** Níveis de patins ao nascer. */
  speedLevel?: number;
  /** Alcance a mais ao nascer. */
  range?: number;
  /** Habilidades de item ao nascer (`chute`…). */
  abilities?: readonly string[];
  /** Sobreposição de terreno (como a das montarias; a da montaria vale primeiro). */
  terrainOverrides?: Readonly<Record<string, TerrainOverride>>;
  /** Chamas absorvidas por rodada. */
  flameShields?: number;
  /** No mato alto, some também andando (só o render usa). */
  hiddenWhileMoving?: boolean;
}

export interface CharacterDef {
  id: string;
  passive: CharacterPassive;
  /** Especial (barra de energia cheia); ausente = sem especial ainda. */
  special?: SpecialDef;
}

/** Aplica a passiva no jogador recém-criado, respeitando os limites dos power-ups. */
export function applyPassive(player: Player, def: CharacterDef, rules: Rules): void {
  const { passive } = def;
  player.character = def.id;
  player.speedLevel = Math.min(rules.maxSpeedLevel, player.speedLevel + (passive.speedLevel ?? 0));
  player.range = Math.min(rules.maxRange, player.range + (passive.range ?? 0));
  for (const ability of passive.abilities ?? []) player.abilities.add(ability);
  player.flameShields = passive.flameShields ?? 0;
}

/**
 * Personagens dos bots: sorteados com a seed entre os que o jogador não escolheu, sem repetir
 * (Fisher–Yates). Faltando personagens, os bots restantes ficam sem (null).
 */
export function assignBotCharacters(
  ids: readonly string[],
  chosen: string | null,
  count: number,
  seed: number,
): (string | null)[] {
  const pool = ids.filter((id) => id !== chosen);
  const rng = createRng(seed);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const tmp = pool[i] ?? '';
    pool[i] = pool[j] ?? '';
    pool[j] = tmp;
  }
  return Array.from({ length: count }, (_, i) => pool[i] ?? null);
}
