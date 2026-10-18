import Phaser from 'phaser';
import { SilentAudio } from '../audio/AudioService';
import { EventSounds } from '../audio/EventSounds';
import type { Command } from '../core/commands';
import { createBot, runBots, type Bot } from '../core/bots/bot';
import { assignBotCharacters } from '../core/characters';
import { DIRECTION_VECTORS } from '../core/direction';
import { createFixedStep, type FixedStep } from '../core/fixedStep';
import { ringPoint } from '../core/ghost';
import { countSpawns } from '../core/grid';
import { WALL } from '../core/terrainIds';
import { msToTicks } from '../core/time';
import { createMatch, stepMatch, type Match } from '../core/match';
import type { World } from '../core/world';
import { botConfigs, characters, gameConfig, items, maps, mounts, sounds, terrains } from '../data';
import type { BattleSettings } from '../ui/settings';
import { matchRulesFromConfig, rulesFromConfig } from '../data/rules';
import type { GameEvent } from '../events';
import type { PlayerInput } from '../input/PlayerInput';
import type { TouchControls } from '../input/TouchControls';
import type { DebugPanel } from '../ui/DebugPanel';
import { debugInfo } from '../ui/debugInfo';
import { MatchHud } from '../ui/MatchHud';
import { buttonsView } from '../ui/controlsModel';
import { DebugOverlay } from './DebugOverlay';
import { SpritePool } from './SpritePool';
import { themeTextures, tileVariant } from './theme';

// Cor de reserva para terreno sem textura no tema (as texturas vêm do manifest).
const PLACEHOLDER_COLORS: Readonly<Record<string, number>> = {
  chao: 0x2e7d32,
  parede: 0x4a4a6a,
  bloco: 0xa1887f,
  agua_rasa: 0x4fc3f7,
  agua_funda: 0x1565c0,
  mato_alto: 0x1b5e20,
  gelo: 0xb3e5fc,
  lama: 0x5d4037,
};
const UNKNOWN_COLOR = 0xff00ff;
const SPAWN_COLOR = 0xffeb3b;
const PLAYER_COLORS = gameConfig.render.playerColors.map((hex) => parseInt(hex.slice(1), 16));
const BOMB_COLOR = 0x111111;
const BOMB_FUSE_COLOR = 0xffa000;
const FLAME_OUTER = 0xff6d00;
const FLAME_INNER = 0xffe082;
/** Maré da Iara: água por cima do chão (placeholder). */
const TIDE_COLOR = 0x4fc3f7;
/** Itens: fundo e símbolo por id (placeholder até o manifest do tema). */
const ITEM_COLORS: Readonly<Record<string, { bg: number; fg: number }>> = {
  bomba: { bg: 0xeceff1, fg: 0x111111 },
  fogo: { bg: 0xff7043, fg: 0xffe082 },
  fogo_max: { bg: 0xc62828, fg: 0xffe082 },
  patins: { bg: 0x26c6da, fg: 0xffffff },
  perfurante: { bg: 0x8e24aa, fg: 0xffffff },
  atravessa_bloco: { bg: 0x8d6e63, fg: 0xd7ccc8 },
  chute: { bg: 0x43a047, fg: 0xffffff },
  remota: { bg: 0x37474f, fg: 0xff5252 },
};
/** Ovos: oval claro com a pinta da cor da montaria. */
const EGG_COLORS: Readonly<Record<string, { bg: number; fg: number }>> = {
  ovo_capivara: { bg: 0xefebe9, fg: 0x8d6e63 },
  ovo_sapo_saltador: { bg: 0xf1f8e9, fg: 0x7cb342 },
};
/** Tamanho das fichas (fração do tile) e das montarias (px do SVG, 40 × 32). */
const TOKEN_SCALE = 0.84;
const MOUNT_SIZE = { width: 40, height: 32 } as const;
/** Ordem de desenho (de baixo para cima). */
const DEPTH = { items: 3, bombs: 4, mounts: 5, decoys: 6, players: 7, rings: 8 } as const;

const TILE = gameConfig.render.tileSize;

/** Como começar uma partida (vem dos menus ou dos atalhos de URL). */
export interface ArenaStart {
  settings: BattleSettings;
  seed: number;
  /** false (`?ia=0`): adversários parados. */
  botsEnabled: boolean;
  /** Encurta a rodada (testes da morte súbita). */
  roundMs: number | null;
  /** Vitórias para vencer (testes do Resultado). */
  winsToWin: number | null;
}

export class ArenaScene extends Phaser.Scene {
  private match!: Match;
  private hud: MatchHud | null = null;
  private start!: ArenaStart;
  private paused = false;
  /** Avisa o fim da partida (o main mostra o Resultado). */
  onMatchOver: (winnerId: number, wins: readonly number[]) => void = () => undefined;
  /** Personagem de cada jogador da partida atual (índice = id). */
  private playerCharacters: (string | null)[] = [];
  private stepper!: FixedStep;
  private readonly commands: Command[] = [];
  /** Comandos de um tick (jogador local + bots), reaproveitado para não alocar por tick. */
  private readonly tickCommands: Command[] = [];
  private bots: Bot[] = [];
  private readonly gameEvents: GameEvent[] = [];
  private readonly eventSounds = new EventSounds(new SilentAudio(), sounds);
  /** Terreno desenhado com as texturas do tema; redesenhado só quando um tile muda. */
  private terrainLayer!: Phaser.GameObjects.RenderTexture;
  /** Chaves de textura de cada terreno (variações), resolvidas pelo manifest. */
  private readonly tileKeys = new Map<string, string[]>();
  private gridLayer!: Phaser.GameObjects.Graphics;
  private dynamicLayer!: Phaser.GameObjects.Graphics;
  /** Ficha de cada jogador (avatar em círculo) e a montaria por baixo. */
  private playerSprites: Phaser.GameObjects.Image[] = [];
  private mountSprites: Phaser.GameObjects.Image[] = [];
  /** Anéis na cor do lugar, com o entalhe para onde o jogador está virado. */
  private ringLayer!: Phaser.GameObjects.Graphics;
  private itemPool!: SpritePool;
  private bombPool!: SpritePool;
  private decoyPool!: SpritePool;
  /** Posição de cada jogador no quadro anterior (x, y intercalados), para saber quem se mexeu. */
  private lastPositions: number[] = [];
  private origin = { x: 0, y: 0 };
  private seed = 0;
  private mapId = '';
  private debugOverlay: DebugOverlay | null = null;

  /** `playerInput` gera os comandos do jogador local (id 0); `debug` só existe com ?debug=1. */
  constructor(
    private readonly playerInput: PlayerInput,
    private readonly debug: DebugPanel | null = null,
    private readonly touch: TouchControls | null = null,
  ) {
    super('arena');
  }

  /** Mundo da rodada atual (a partida troca de mundo a cada rodada). */
  private get world(): World {
    return this.match.world;
  }

  init(data: ArenaStart): void {
    this.start = data;
    this.paused = false;
  }

  /** Pausa: a simulação para (o menu de pausa está aberto). */
  pause(): void {
    this.paused = true;
  }

  /** Continua sem rajada de ticks: o passo fixo recomeça do zero. */
  resume(): void {
    this.paused = false;
    this.stepper = createFixedStep(gameConfig.tickRate, gameConfig.maxTicksPerFrame);
  }

  /** Personagem de cada jogador da partida atual (para o Resultado). */
  get characters(): readonly (string | null)[] {
    return this.playerCharacters;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /** Carrega as texturas do tema: terreno, fichas, montarias, itens e bomba (uma vez por chave). */
  preload(): void {
    const load = (name: string, width: number, height = width): void => {
      for (const tex of themeTextures(name)) {
        if (!this.textures.exists(tex.key)) this.load.svg(tex.key, tex.url, { width, height });
      }
    };
    // SVGs em 2× para ficarem nítidos quando o FIT aumenta a tela.
    for (const id of characters.keys()) load(`player.${id}`, TILE * 2);
    for (const id of mounts.keys())
      load(`mount.${id}`, MOUNT_SIZE.width * 2, MOUNT_SIZE.height * 2);
    for (const id of items.keys()) load(`item.${id}`, TILE * 2);
    load('bomb.default', TILE * 2);
    for (const id of terrains.keys()) {
      const textures = themeTextures(`tile.${id}`);
      this.tileKeys.set(
        id,
        textures.map((tex) => tex.key),
      );
      for (const tex of textures) {
        if (!this.textures.exists(tex.key)) {
          this.load.svg(tex.key, tex.url, { width: TILE, height: TILE });
        }
      }
    }
  }

  create(): void {
    const { settings, seed, botsEnabled, roundMs, winsToWin } = this.start;
    const map = maps.get(settings.mapId) ?? maps.get(gameConfig.map.default);
    if (!map) throw new Error(`Mapa não encontrado: ${settings.mapId}`);

    this.seed = seed;
    this.mapId = map.id;
    this.commands.length = 0;
    this.gameEvents.length = 0;
    // Spawns limitam a partida: 1 jogador + até 3 bots.
    const players = Math.min(1 + settings.bots, countSpawns(map));
    // O jogador escolhe; os bots sorteiam (com a seed) entre os outros, sem repetir.
    this.playerCharacters = [
      settings.character,
      ...assignBotCharacters([...characters.keys()], settings.character, players - 1, seed),
    ];
    this.match = createMatch(
      {
        map,
        terrains,
        rules: rulesFromConfig(gameConfig),
        matchRules: {
          ...matchRulesFromConfig(gameConfig),
          ...(roundMs === null ? {} : { roundTicks: msToTicks(roundMs, gameConfig.tickRate) }),
          ...(winsToWin === null ? {} : { winsToWin }),
        },
        seed,
        items,
        defaultItems: gameConfig.items.defaultDistribution,
        mounts,
        characters,
        playerCharacters: this.playerCharacters,
        players,
      },
      this.gameEvents,
    );
    console.info(
      `[arena] mapa ${map.id}, seed ${seed}, personagens ${this.playerCharacters.join(' ')}`,
    );
    // Só em dev: inspeção pelo console e pelos testes e2e. Nunca escrever na partida por aqui.
    if (import.meta.env.DEV) Object.assign(window, { __arena: this.match });

    const botConfig = botConfigs.get(settings.level) ?? botConfigs.get('medio');
    if (!botConfig) throw new Error('nível de bot não encontrado');
    // Jogador local = id 0; os demais são bots.
    this.bots = botsEnabled
      ? this.world.players.slice(1).map((p) => createBot(p.id, botConfig, seed))
      : [];

    this.stepper = createFixedStep(gameConfig.tickRate, gameConfig.maxTicksPerFrame);
    this.hud = new MatchHud(document.body, this.world.players.length, this.playerCharacters);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hud?.destroy();
      this.hud = null;
    });

    const { width, height } = this.scale.gameSize;
    this.origin = {
      x: Math.floor((width - this.world.grid.cols * TILE) / 2),
      // Abaixo da barra do HUD (não centralizada), se couber.
      y: Math.min(gameConfig.render.boardTop, height - this.world.grid.rows * TILE),
    };

    this.terrainLayer = this.add.renderTexture(0, 0, width, height).setOrigin(0, 0);
    this.gridLayer = this.add.graphics();
    this.dynamicLayer = this.add.graphics();
    this.itemPool = new SpritePool(this, DEPTH.items);
    this.bombPool = new SpritePool(this, DEPTH.bombs);
    this.decoyPool = new SpritePool(this, DEPTH.decoys);
    this.ringLayer = this.add.graphics().setDepth(DEPTH.rings);
    this.debugOverlay = this.debug
      ? new DebugOverlay(this.add.graphics(), this.origin, TILE)
      : null;
    this.drawGrid();
    this.mountSprites = this.world.players.map(() =>
      this.add.image(0, 0, '__WHITE').setDepth(DEPTH.mounts).setVisible(false),
    );
    this.playerSprites = this.world.players.map((p) =>
      this.add
        .image(0, 0, this.tokenKey(p.id))
        .setDepth(DEPTH.players)
        .setDisplaySize(TILE * TOKEN_SCALE, TILE * TOKEN_SCALE),
    );
    this.handleEvents();
    this.syncPlayers();
  }

  override update(_time: number, deltaMs: number): void {
    this.playerInput.poll(this.commands);
    if (this.paused) {
      // Pausado: descarta a entrada (nada de bomba "guardada" para depois) e não simula.
      this.commands.length = 0;
      return;
    }
    // Painel de debug: cada clique num item vira um comando (o painel não escreve no mundo).
    for (const itemId of this.debug?.takeItemRequests() ?? []) {
      this.commands.push({ type: 'debugItem', playerId: 0, itemId });
    }
    if ((this.debug?.takeEnergyRequests() ?? 0) > 0) {
      this.commands.push({ type: 'debugEnergy', playerId: 0 });
    }
    const ticks = this.stepper.advance(deltaMs);
    for (let i = 0; i < ticks; i++) {
      // Comandos do jogador entram no primeiro tick do quadro; os bots decidem a cada tick.
      const cmds = this.tickCommands;
      cmds.length = 0;
      if (i === 0) cmds.push(...this.commands);
      runBots(this.match, this.bots, cmds);
      stepMatch(this.match, cmds, this.gameEvents);
    }
    if (ticks > 0) this.commands.length = 0;

    this.handleEvents();
    this.hud?.update(this.match, this.time.now);
    if (this.touch) {
      const view = buttonsView(this.world, 0);
      this.touch.setButtons(view.states, view.specialFill);
    }
    this.syncPlayers();
    this.drawDynamic();
    this.drawDebug();
  }

  private drawDebug(): void {
    if (!this.debug || !this.debugOverlay) return;
    this.debugOverlay.draw(this.world, this.debug.layers);
    this.debug.update(this.time.now, () =>
      debugInfo(this.world, { seed: this.seed, mapId: this.mapId, fps: this.game.loop.actualFps }),
    );
  }

  private handleEvents(): void {
    if (this.gameEvents.length === 0) return;
    this.eventSounds.handle(this.gameEvents);
    this.hud?.handle(this.gameEvents, this.time.now);
    let gridChanged = false;
    for (const e of this.gameEvents) {
      // Rodada nova = mundo novo: redesenha a grade e volta os jogadores ao spawn.
      if (
        e.type === 'bloco.destruido' ||
        e.type === 'terreno.queimou' ||
        e.type === 'morte_subita.bloco_caiu' ||
        e.type === 'rodada.contagem'
      ) {
        gridChanged = true;
      }
      if (e.type === 'partida.terminou') this.onMatchOver(e.winnerId, e.wins);
    }
    if (gridChanged) this.drawGrid();
    this.gameEvents.length = 0;
  }

  private toScreen(x: number, y: number): { x: number; y: number } {
    return { x: this.origin.x + (x + 0.5) * TILE, y: this.origin.y + (y + 0.5) * TILE };
  }

  /** Textura da ficha do jogador (avatar do personagem) ou um círculo na cor do lugar. */
  private tokenKey(playerId: number): string {
    const character = this.playerCharacters[playerId];
    const key = character ? themeTextures(`player.${character}`)[0]?.key : undefined;
    if (key && this.textures.exists(key)) return key;
    const fallback = `fallback.player.${playerId}`;
    if (!this.textures.exists(fallback)) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(PLAYER_COLORS[playerId] ?? UNKNOWN_COLOR).fillCircle(TILE, TILE, TILE);
      g.generateTexture(fallback, TILE * 2, TILE * 2);
      g.destroy();
    }
    return fallback;
  }

  /** Chave carregada de um nome lógico do tema (1ª variação), ou undefined. */
  private themeKey(name: string): string | undefined {
    const key = themeTextures(name)[0]?.key;
    return key !== undefined && this.textures.exists(key) ? key : undefined;
  }

  /** Anel na cor do lugar em volta da ficha, com um entalhe apontando para `facing`. */
  private drawRing(
    playerId: number,
    x: number,
    y: number,
    radius: number,
    facing: keyof typeof DIRECTION_VECTORS,
    alpha: number,
  ): void {
    if (alpha <= 0) return;
    const color = PLAYER_COLORS[playerId] ?? UNKNOWN_COLOR;
    const g = this.ringLayer;
    g.lineStyle(3, color, alpha);
    g.strokeCircle(x, y, radius);
    const { dx, dy } = DIRECTION_VECTORS[facing];
    const tipX = x + dx * (radius + 5);
    const tipY = y + dy * (radius + 5);
    const baseX = x + dx * (radius - 1);
    const baseY = y + dy * (radius - 1);
    g.fillStyle(color, alpha);
    g.fillTriangle(tipX, tipY, baseX - dy * 4, baseY - dx * 4, baseX + dy * 4, baseY + dx * 4);
  }

  private syncPlayers(): void {
    this.ringLayer.clear();
    const radius = (TILE * TOKEN_SCALE) / 2 + 1;
    this.world.players.forEach((p, i) => {
      const sprite = this.playerSprites[i];
      if (!sprite) return;
      const mountSprite = this.mountSprites[i];
      if (p.ghost) {
        // Fantasma: pequeno e translúcido, sobre o anel da borda.
        const at = ringPoint(this.world.grid, p.ghost.s);
        const gp = this.toScreen(at.x, at.y);
        const size = TILE * TOKEN_SCALE * 0.7;
        sprite.setPosition(gp.x, gp.y).setDisplaySize(size, size).setAlpha(0.45);
        this.drawRing(p.id, gp.x, gp.y, size / 2 + 1, p.facing, p.ghost.thrown ? 0.3 : 0.9);
        mountSprite?.setVisible(false);
        return;
      }
      const pos = this.toScreen(p.x, p.y);
      const moved = this.lastPositions[i * 2] !== p.x || this.lastPositions[i * 2 + 1] !== p.y;
      this.lastPositions[i * 2] = p.x;
      this.lastPositions[i * 2 + 1] = p.y;

      // Mato alto: o jogador local se vê meio transparente; os outros, só o anel ao se mexer.
      const id = this.world.grid.tiles[Math.round(p.y) * this.world.grid.cols + Math.round(p.x)];
      const hidden = p.alive && id !== undefined && this.world.terrains.get(id)?.hides === true;
      let fill = p.alive ? 1 : 0.3;
      let stroke = fill;
      if (hidden && p.id === 0) fill = stroke = 0.5;
      else if (hidden) {
        // Curupira (passiva `hiddenWhileMoving`) não mostra nem o anel andando.
        const vanishes =
          p.character !== null && characters.get(p.character)?.passive.hiddenWhileMoving === true;
        fill = 0;
        stroke = moved && !vanishes ? 0.8 : 0;
      }
      // Pulo: cresce no meio do arco. Invulnerável: pisca.
      const jump = p.jump;
      const arc = jump ? Math.sin(Math.PI * (1 - jump.ticksLeft / jump.totalTicks)) : 0;
      if (p.invulnerableTicks > 0 && Math.floor(this.world.tick / 4) % 2 === 0)
        fill = stroke = 0.25;
      const scale = 1 + arc * 0.35;
      const y = pos.y - arc * TILE * 0.4;
      const size = TILE * TOKEN_SCALE * scale;
      sprite.setPosition(pos.x, y).setDisplaySize(size, size).setAlpha(fill);
      this.drawRing(p.id, pos.x, y, radius * scale, p.facing, stroke);

      if (mountSprite) {
        const key = p.mount === null ? undefined : this.themeKey(`mount.${p.mount}`);
        const show = p.alive && key !== undefined && !(hidden && p.id !== 0);
        mountSprite.setVisible(show);
        if (show && key !== undefined) {
          if (mountSprite.texture.key !== key) mountSprite.setTexture(key);
          mountSprite
            .setDisplaySize(TILE * 1.45 * scale, TILE * 1.15 * scale)
            .setFlipX(p.facing === 'left')
            .setAlpha(hidden ? 0.5 : 1)
            .setPosition(pos.x, pos.y + TILE * 0.3 - arc * TILE * 0.4);
        }
      }
    });
  }

  private drawGrid(): void {
    const { cols, tiles, spawns } = this.world.grid;
    const g = this.gridLayer.clear();
    const rt = this.terrainLayer.clear();

    tiles.forEach((id, i) => {
      const tx = i % cols;
      const ty = Math.floor(i / cols);
      const x = this.origin.x + tx * TILE;
      const y = this.origin.y + ty * TILE;
      const keys = this.tileKeys.get(id) ?? [];
      const key = keys[tileVariant(tx, ty, keys.length)];
      if (key !== undefined && this.textures.exists(key)) {
        rt.draw(key, x, y);
      } else {
        // Sem textura no tema: cor de reserva.
        g.fillStyle(PLACEHOLDER_COLORS[id] ?? UNKNOWN_COLOR);
        g.fillRect(x, y, TILE, TILE);
      }
    });

    g.fillStyle(SPAWN_COLOR, 0.35);
    for (const s of spawns) {
      if (tiles[s.y * cols + s.x] === WALL) continue; // caiu na morte súbita
      const pos = this.toScreen(s.x, s.y);
      g.fillCircle(pos.x, pos.y, TILE / 4);
    }
  }

  /** Bombas e chamas: redesenhadas a cada quadro na mesma Graphics (sem alocar objetos). */
  private drawDynamic(): void {
    const { cols } = this.world.grid;
    const { fuseTicks, explosionTicks } = this.world.rules;
    const g = this.dynamicLayer.clear();

    // Maré da Iara: os tiles alagados ficam azulados (mais claros quando estão secando).
    this.world.tideTicks.forEach((left, i) => {
      if (left === 0) return;
      g.fillStyle(TIDE_COLOR, Math.min(0.45, 0.15 + left / 120));
      g.fillRect(
        this.origin.x + (i % cols) * TILE,
        this.origin.y + Math.floor(i / cols) * TILE,
        TILE,
        TILE,
      );
    });

    this.world.flames.forEach((left, i) => {
      if (left === 0) return;
      const x = this.origin.x + (i % cols) * TILE;
      const y = this.origin.y + Math.floor(i / cols) * TILE;
      const inset = (1 - left / explosionTicks) * (TILE / 4); // encolhe enquanto apaga
      g.fillStyle(FLAME_OUTER, 0.9);
      g.fillRect(x + inset, y + inset, TILE - inset * 2, TILE - inset * 2);
      g.fillStyle(FLAME_INNER);
      g.fillRect(
        x + TILE / 4 + inset / 2,
        y + TILE / 4 + inset / 2,
        TILE / 2 - inset,
        TILE / 2 - inset,
      );
    });

    // Morte súbita: os próximos tiles a cair piscam em vermelho.
    const collapse = this.world.collapse;
    if (collapse) {
      const blink = 0.25 + 0.2 * Math.sin(this.world.tick * 0.4);
      g.fillStyle(0xff1744, blink);
      for (let k = collapse.next; k < Math.min(collapse.next + 3, collapse.order.length); k++) {
        const tile = collapse.order[k] ?? 0;
        g.fillRect(
          this.origin.x + (tile % cols) * TILE,
          this.origin.y + Math.floor(tile / cols) * TILE,
          TILE,
          TILE,
        );
      }
    }

    this.itemPool.begin();
    this.world.items.forEach((itemId, i) => {
      if (itemId === null) return;
      const itemKey = this.themeKey(`item.${itemId}`);
      if (itemKey) {
        this.itemPool.place(
          itemKey,
          this.origin.x + (i % cols) * TILE + TILE / 2,
          this.origin.y + Math.floor(i / cols) * TILE + TILE / 2,
          TILE,
        );
        return;
      }
      // Sem ícone no tema: formas de reserva.
      const egg = EGG_COLORS[itemId];
      if (egg) {
        const cx = this.origin.x + (i % cols) * TILE + TILE / 2;
        const cy = this.origin.y + Math.floor(i / cols) * TILE + TILE / 2;
        g.fillStyle(egg.bg);
        g.fillEllipse(cx, cy, TILE * 0.5, TILE * 0.66);
        g.lineStyle(2, 0xffffff, 0.9);
        g.strokeEllipse(cx, cy, TILE * 0.5, TILE * 0.66);
        g.fillStyle(egg.fg);
        g.fillCircle(cx - 3, cy - 3, 3);
        g.fillCircle(cx + 4, cy + 4, 2);
        return;
      }
      const colors = ITEM_COLORS[itemId] ?? { bg: UNKNOWN_COLOR, fg: 0xffffff };
      const x = this.origin.x + (i % cols) * TILE;
      const y = this.origin.y + Math.floor(i / cols) * TILE;
      g.fillStyle(colors.bg);
      g.fillRoundedRect(x + 5, y + 5, TILE - 10, TILE - 10, 5);
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeRoundedRect(x + 5, y + 5, TILE - 10, TILE - 10, 5);
      g.fillStyle(colors.fg);
      g.fillCircle(x + TILE / 2, y + TILE / 2, TILE / 7);
    });

    this.itemPool.end();

    const bombKey = this.themeKey('bomb.default');
    this.bombPool.begin();
    // Bombas de fantasma em voo: arco do anel até o pouso.
    for (const p of this.world.players) {
      const f = p.ghost?.flight;
      if (!f) continue;
      const t = 1 - f.ticksLeft / f.totalTicks;
      const at = this.toScreen(f.fromX + (f.toX - f.fromX) * t, f.fromY + (f.toY - f.fromY) * t);
      const ay = at.y - Math.sin(Math.PI * t) * TILE * 0.9;
      if (bombKey) {
        this.bombPool.place(bombKey, at.x, ay, TILE * 0.85);
      } else {
        g.fillStyle(BOMB_COLOR);
        g.fillCircle(at.x, ay, TILE * 0.3);
      }
    }

    for (const bomb of this.world.bombs) {
      // Bomba chutada: desenha entre os tiles, pelo avanço do deslize.
      const slide = bomb.slide ? DIRECTION_VECTORS[bomb.slide] : null;
      const offset = bomb.slideProgress ?? 0;
      const pos = this.toScreen(
        bomb.x + (slide ? slide.dx * offset : 0),
        bomb.y + (slide ? slide.dy * offset : 0),
      );
      // Pulsa mais rápido perto de explodir.
      const urgency = 1 - bomb.fuse / fuseTicks;
      const pulse = 1 + 0.08 * Math.sin(this.world.tick * (0.2 + urgency * 0.6));
      if (bombKey) {
        this.bombPool.place(bombKey, pos.x, pos.y, TILE * pulse);
        continue;
      }
      g.fillStyle(BOMB_COLOR);
      g.fillCircle(pos.x, pos.y, TILE * 0.36 * pulse);
      g.fillStyle(BOMB_FUSE_COLOR);
      g.fillCircle(pos.x + TILE * 0.2, pos.y - TILE * 0.24, TILE * 0.08);
    }
    this.bombPool.end();

    // Pegada falsa: o clone é desenhado igual ao Curupira (é para enganar).
    this.decoyPool.begin();
    const size = TILE * TOKEN_SCALE;
    for (const d of this.world.decoys) {
      const pos = this.toScreen(d.body.x, d.body.y);
      this.decoyPool.place(this.tokenKey(d.ownerId), pos.x, pos.y, size);
      this.drawRing(d.ownerId, pos.x, pos.y, size / 2 + 1, d.body.facing, 1);
    }
    this.decoyPool.end();
  }
}
