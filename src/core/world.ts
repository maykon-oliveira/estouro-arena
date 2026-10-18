import type { GameEvent } from '../events';
import { detonateOldestRemote, placeBomb, updateBombs } from './bombs';
import type { Command } from './commands';
import type { Direction } from './direction';
import { generateGrid, type Grid, type MapDefinition } from './grid';
import { collectItems, hideItems, type ItemDef } from './items';
import { ghostCommand, updateGhosts, type Ghost } from './ghost';
import { kickBombs } from './kick';
import { advanceJump, loseMount, useMountAbility, type Jump, type MountDef } from './mounts';
import { movePlayer } from './movement';
import type { Collapse } from './suddenDeath';
import { createRng, type Rng } from './rng';
import { applyPassive, type CharacterDef } from './characters';
import {
  addEnergy,
  advanceDash,
  invert,
  updateCharm,
  updateSpecials,
  useSpecial,
  type Dash,
  type Decoy,
} from './specials';

/** Propriedades de terreno que a simulação consulta (subconjunto de src/data/terrains.json). */
export interface TerrainRules {
  walkable: boolean;
  speedMultiplier: number;
  blocksFire: boolean;
  destructible: boolean;
  allowsBomb: boolean;
  /** Esconde quem está dentro (só o render e a visão dos bots usam). */
  hides?: boolean;
  /** Quem se move sobre ele desliza até bater ou sair. */
  slippery?: boolean;
}

/** Parâmetros de regra vindos de src/data/game.json (durações já em ticks). */
export interface Rules {
  tickRate: number;
  /** Tiles por segundo em terreno normal. */
  playerSpeed: number;
  /** Distância máxima (em tiles) que a assistência de curva desliza o jogador. */
  cornerAssistTiles: number;
  spawnSafeRadius: number;
  fuseTicks: number;
  explosionTicks: number;
  startBombs: number;
  startRange: number;
  /** Limites dos power-ups. */
  maxBombs: number;
  maxRange: number;
  /** Tiles/s a mais por nível de patins. */
  speedStep: number;
  maxSpeedLevel: number;
  /** Velocidade da bomba chutada, em tiles por segundo. */
  kickSpeed: number;
  /** Invulnerabilidade depois de perder a montaria. */
  mountInvulnerableTicks: number;
  /** Invulnerabilidade depois do escudo do personagem (Mula sem Cabeça). */
  shieldInvulnerableTicks: number;
  /** Barra de energia: máximo e ganhos (bloco, nocaute, segundo vivo). */
  energyMax: number;
  energyPerBlock: number;
  energyPerKnockout: number;
  energyPerSecond: number;
  /** Fantasma vingador: espera depois da morte, velocidade no anel (tiles/s), distância mínima do pouso e duração do voo. */
  ghostDelayTicks: number;
  ghostSpeed: number;
  ghostThrowTiles: number;
  ghostFlightTicks: number;
}

export interface Player {
  id: number;
  /** Posição contínua em tiles; inteiros = centro do tile. */
  x: number;
  y: number;
  facing: Direction;
  /** Direção segurada no momento (último comando de movimento). */
  moveDir: Direction | null;
  /** Deslizando no gelo nesta direção (ignora `moveDir` até bater ou sair do gelo). */
  iceSlide: Direction | null;
  alive: boolean;
  /** Bombas simultâneas permitidas. */
  maxBombs: number;
  /** Alcance da explosão em tiles. */
  range: number;
  /** Níveis de velocidade ganhos com patins. */
  speedLevel: number;
  /** Habilidades ganhas com itens (`perfurante`, `atravessa_bloco`). */
  abilities: Set<string>;
  /** Montaria atual (id de src/data/mounts.json) ou null. */
  mount: string | null;
  /** Ticks de invulnerabilidade a chamas (depois de perder a montaria). */
  invulnerableTicks: number;
  /** Pulo em andamento (sapo): no ar não anda, não colide e não pega fogo. */
  jump: Jump | null;
  /** Ticks até poder usar a habilidade da montaria de novo. */
  abilityCooldown: number;
  /** Tick da morte (para virar fantasma depois do atraso); null vivo. */
  deathTick: number | null;
  /** Fantasma vingador (depois de morto). */
  ghost: Ghost | null;
  /** Personagem (id de src/data/characters.json) ou null (sem passiva). */
  character: string | null;
  /** Chamas que o escudo do personagem ainda absorve nesta rodada. */
  flameShields: number;
  /** Barra de energia (0 a `rules.energyMax`); cheia, libera o especial. */
  energy: number;
  /** Ticks restantes do encanto do Boto (controles invertidos); 0 = normal. */
  charmTicks: number;
  /** Disparada da Mula em andamento (não anda nem solta bomba). */
  dash: Dash | null;
  /** Ticks restantes do especial com duração (rastro, maré, clone); 0 = nenhum. */
  specialTicks: number;
}

export interface Bomb {
  id: number;
  ownerId: number;
  x: number;
  y: number;
  /** Ticks até explodir. */
  fuse: number;
  range: number;
  /** O fogo atravessa blocos quebráveis (dono com `perfurante` ao soltar). */
  pierce?: boolean;
  /** Remota: o pavio não corre; explode pelo comando `action` do dono (ou atingida por fogo). */
  remote?: boolean;
  /** Direção do deslize depois de um chute (null/ausente = parada). */
  slide?: Direction | null;
  /** Avanço do deslize em relação ao centro do tile, em tiles (−0,5 a 0,5). */
  slideProgress?: number;
}

export interface World {
  tick: number;
  grid: Grid;
  players: Player[];
  bombs: Bomb[];
  /** Ticks restantes de chama por tile (0 = sem chama), mesmo índice de `grid.tiles`. */
  flames: number[];
  /** Dono da chama de cada tile (id do jogador; −1 = ninguém), para creditar energia. */
  flameOwner: number[];
  /** 1 = a chama do tile é do rastro de fogo do Boitatá (não fere o próprio dono). */
  flameFromTrail: number[];
  /** Maré da Iara: ticks restantes e dona de cada tile alagado, e o multiplicador da vez. */
  tideTicks: number[];
  tideOwner: number[];
  tideMultiplier: number;
  /** Clones da Pegada falsa (Curupira) em jogo. */
  decoys: Decoy[];
  nextBombId: number;
  /** Item visível por tile (mesmo índice de `grid.tiles`); null = nenhum. */
  items: (string | null)[];
  /** Item escondido em cada bloco; aparece quando o bloco vira chão. */
  hiddenItems: (string | null)[];
  /** Morte súbita: queda dos tiles em andamento (null antes de começar). */
  collapse: Collapse | null;
  readonly itemDefs: ReadonlyMap<string, ItemDef>;
  readonly mountDefs: ReadonlyMap<string, MountDef>;
  readonly characterDefs: ReadonlyMap<string, CharacterDef>;
  readonly terrains: ReadonlyMap<string, TerrainRules>;
  readonly rules: Rules;
  readonly rng: Rng;
}

export interface WorldOptions {
  map: MapDefinition;
  terrains: ReadonlyMap<string, TerrainRules>;
  rules: Rules;
  seed: number;
  players: number;
  /** Catálogo de itens (src/data/items.json); sem ele, nenhum item é sorteado. */
  items?: ReadonlyMap<string, ItemDef>;
  /** Itens escondidos quando a fase não tem `blocos.itens`. */
  defaultItems?: Readonly<Record<string, number>>;
  /** Catálogo de montarias (src/data/mounts.json). */
  mounts?: ReadonlyMap<string, MountDef>;
  /** Catálogo de personagens (src/data/characters.json). */
  characters?: ReadonlyMap<string, CharacterDef>;
  /** Personagem de cada jogador (índice = id); faltando ou null, sem passiva. */
  playerCharacters?: readonly (string | null)[];
}

export function createWorld(options: WorldOptions): World {
  const { rules } = options;
  const rng = createRng(options.seed);
  const grid = generateGrid(options.map, rng, rules.spawnSafeRadius);
  if (options.players > grid.spawns.length) {
    throw new Error(`mapa tem ${grid.spawns.length} spawns para ${options.players} jogadores`);
  }
  const players = grid.spawns.slice(0, options.players).map((s, id): Player => ({
    id,
    x: s.x,
    y: s.y,
    facing: 'down',
    moveDir: null,
    iceSlide: null,
    alive: true,
    maxBombs: rules.startBombs,
    range: rules.startRange,
    speedLevel: 0,
    abilities: new Set<string>(),
    mount: null,
    invulnerableTicks: 0,
    jump: null,
    abilityCooldown: 0,
    deathTick: null,
    ghost: null,
    character: null,
    flameShields: 0,
    energy: 0,
    charmTicks: 0,
    dash: null,
    specialTicks: 0,
  }));
  const characterDefs = options.characters ?? new Map<string, CharacterDef>();
  for (const p of players) {
    const id = options.playerCharacters?.[p.id];
    const def = id ? characterDefs.get(id) : undefined;
    if (def) applyPassive(p, def, rules);
  }
  const itemDefs = options.items ?? new Map<string, ItemDef>();
  const counts = options.map.blocos.itens ?? options.defaultItems ?? {};
  const hiddenItems =
    itemDefs.size > 0
      ? hideItems(grid, counts, rng)
      : new Array<string | null>(grid.tiles.length).fill(null);
  return {
    tick: 0,
    grid,
    players,
    bombs: [],
    flames: new Array<number>(grid.tiles.length).fill(0),
    flameOwner: new Array<number>(grid.tiles.length).fill(-1),
    flameFromTrail: new Array<number>(grid.tiles.length).fill(0),
    tideTicks: new Array<number>(grid.tiles.length).fill(0),
    tideOwner: new Array<number>(grid.tiles.length).fill(-1),
    tideMultiplier: 1,
    decoys: [],
    nextBombId: 0,
    items: new Array<string | null>(grid.tiles.length).fill(null),
    hiddenItems,
    collapse: null,
    itemDefs,
    mountDefs: options.mounts ?? new Map<string, MountDef>(),
    characterDefs,
    terrains: options.terrains,
    rules,
    rng,
  };
}

/**
 * Avança a simulação em exatamente um tick:
 * comandos → movimento → coleta → chutes → bombas/chamas → mortes.
 * Os eventos do tick são acrescentados em `out` (também devolvido).
 */
export function step(
  world: World,
  commands: readonly Command[],
  out: GameEvent[] = [],
): GameEvent[] {
  for (const cmd of commands) {
    const player = world.players[cmd.playerId];
    if (!player) continue;
    if (!player.alive) {
      // Morto: só o fantasma (anel e arremesso com a bomba) recebe comandos.
      if (cmd.type === 'move') ghostCommand(world, player, 'move', cmd.dir, out);
      else if (cmd.type === 'bomb') ghostCommand(world, player, 'bomb', null, out);
      continue;
    }
    // Encantado (Boto): a direção chega invertida.
    if (cmd.type === 'move') player.moveDir = player.charmTicks > 0 ? invert(cmd.dir) : cmd.dir;
    else if (cmd.type === 'bomb') placeBomb(world, player, out);
    else if (cmd.type === 'remote') detonateOldestRemote(world, player);
    else if (cmd.type === 'mount') useMountAbility(world, player, out);
    else if (cmd.type === 'special') useSpecial(world, player, out);
    else if (cmd.type === 'debugItem' && world.itemDefs.has(cmd.itemId)) {
      // Painel de debug: põe o item no tile do jogador (coletado logo abaixo).
      world.items[Math.round(player.y) * world.grid.cols + Math.round(player.x)] = cmd.itemId;
    } else if (cmd.type === 'debugEnergy') {
      addEnergy(world, player, world.rules.energyMax, out);
    }
  }

  // Fim de cada segundo da rodada (ticks 59, 119…): +energia para quem está vivo.
  const secondTick = (world.tick + 1) % world.rules.tickRate === 0;
  for (const player of world.players) {
    if (!player.alive) continue;
    if (player.abilityCooldown > 0) player.abilityCooldown--;
    if (player.invulnerableTicks > 0) player.invulnerableTicks--;
    updateCharm(player);
    if (secondTick) addEnergy(world, player, world.rules.energyPerSecond, out);
    if (player.jump) advanceJump(player);
    else if (player.dash) advanceDash(player);
    else movePlayer(world, player);
  }
  collectItems(world, out);
  updateSpecials(world, out);
  kickBombs(world, out);
  updateGhosts(world, out);

  updateBombs(world, out);
  killPlayersInFlames(world, out);
  armOrphanRemotes(world);

  world.tick++;
  return out;
}

/** Remotas de quem morreu ganham pavio normal (senão ficariam no mapa para sempre). */
function armOrphanRemotes(world: World): void {
  for (const bomb of world.bombs) {
    if (bomb.remote && !world.players[bomb.ownerId]?.alive) {
      bomb.remote = false;
      bomb.fuse = world.rules.fuseTicks;
    }
  }
}

function killPlayersInFlames(world: World, out: GameEvent[]): void {
  for (const player of world.players) {
    if (!player.alive) continue;
    // No ar (pulo) ou invulnerável, a chama não pega; montado, o escudo da montaria absorve
    // primeiro, e depois o do personagem.
    if (player.jump || player.invulnerableTicks > 0) continue;
    const i = Math.round(player.y) * world.grid.cols + Math.round(player.x);
    // O rastro de fogo do Boitatá não fere o próprio Boitatá.
    if (world.flameFromTrail[i] === 1 && world.flameOwner[i] === player.id) continue;
    if ((world.flames[i] ?? 0) > 0) {
      if (player.mount !== null) {
        loseMount(world, player, out);
        continue;
      }
      if (player.flameShields > 0) {
        player.flameShields--;
        player.invulnerableTicks = world.rules.shieldInvulnerableTicks;
        out.push({
          type: 'personagem.escudo',
          playerId: player.id,
          characterId: player.character ?? '',
        });
        continue;
      }
      player.alive = false;
      player.moveDir = null;
      player.deathTick = world.tick;
      player.dash = null;
      out.push({ type: 'jogador.morreu', playerId: player.id, cause: 'fogo' });
      // Nocaute: energia para o dono da chama (a própria bomba não conta).
      const owner = world.players[world.flameOwner[i] ?? -1];
      if (owner && owner !== player) addEnergy(world, owner, world.rules.energyPerKnockout, out);
    }
  }
}
