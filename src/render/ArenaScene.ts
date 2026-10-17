import Phaser from 'phaser';
import { SilentAudio } from '../audio/AudioService';
import { EventSounds } from '../audio/EventSounds';
import type { Command } from '../core/commands';
import { createBot, runBots, type Bot } from '../core/bots/bot';
import { DIRECTION_VECTORS } from '../core/direction';
import { createFixedStep, type FixedStep } from '../core/fixedStep';
import { ringPoint, throwOrigin } from '../core/ghost';
import { countSpawns } from '../core/grid';
import { WALL } from '../core/terrainIds';
import { msToTicks } from '../core/time';
import { createMatch, stepMatch, type Match } from '../core/match';
import type { World } from '../core/world';
import { botConfigs, gameConfig, items, maps, mounts, sounds, terrains } from '../data';
import type { BattleSettings } from '../ui/settings';
import { matchRulesFromConfig, rulesFromConfig } from '../data/rules';
import type { GameEvent } from '../events';
import type { PlayerInput } from '../input/PlayerInput';
import type { TouchControls } from '../input/TouchControls';
import type { DebugPanel } from '../ui/DebugPanel';
import { debugInfo } from '../ui/debugInfo';
import { MatchHud } from '../ui/MatchHud';
import { DebugOverlay } from './DebugOverlay';
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
/** Montaria: elipse sob o jogador (placeholder). */
const MOUNT_COLORS: Readonly<Record<string, number>> = {
  capivara: 0x8d6e63,
  sapo_saltador: 0x7cb342,
};

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
  private playerSprites: Phaser.GameObjects.Arc[] = [];
  private mountSprites: Phaser.GameObjects.Ellipse[] = [];
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

  get isPaused(): boolean {
    return this.paused;
  }

  /** Carrega as texturas de terreno do tema (uma vez por chave). */
  preload(): void {
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
        // Spawns limitam a partida: 1 jogador + até 3 bots.
        players: Math.min(1 + settings.bots, countSpawns(map)),
      },
      this.gameEvents,
    );
    console.info(`[arena] mapa ${map.id}, seed ${seed}`);
    // Só em dev: inspeção pelo console e pelos testes e2e. Nunca escrever na partida por aqui.
    if (import.meta.env.DEV) Object.assign(window, { __arena: this.match });

    const botConfig = botConfigs.get(settings.level) ?? botConfigs.get('medio');
    if (!botConfig) throw new Error('nível de bot não encontrado');
    // Jogador local = id 0; os demais são bots.
    this.bots = botsEnabled
      ? this.world.players.slice(1).map((p) => createBot(p.id, botConfig, seed))
      : [];

    this.stepper = createFixedStep(gameConfig.tickRate, gameConfig.maxTicksPerFrame);
    this.hud = new MatchHud(document.body, this.world.players.length);
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
    this.debugOverlay = this.debug
      ? new DebugOverlay(this.add.graphics(), this.origin, TILE)
      : null;
    this.drawGrid();
    this.mountSprites = this.world.players.map(() =>
      this.add
        .ellipse(0, 0, TILE * 1.05, TILE * 0.62, 0xffffff)
        .setStrokeStyle(2, 0x000000, 0.6)
        .setVisible(false),
    );
    this.playerSprites = this.world.players.map((p) =>
      this.add
        .circle(0, 0, TILE * 0.4, PLAYER_COLORS[p.id] ?? UNKNOWN_COLOR)
        .setStrokeStyle(2, 0xffffff),
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
    this.touch?.setActionAvailable(this.actionAvailable());
    this.syncPlayers();
    this.drawDynamic();
    this.drawDebug();
  }

  /** Botão de ação aceso: remota do jogador no mapa ou habilidade da montaria pronta. */
  private actionAvailable(): boolean {
    const me = this.world.players[0];
    if (me?.ghost) {
      // Fantasma: o botão (ou a bomba) arremessa, uma vez, fora das quinas.
      return !me.ghost.thrown && throwOrigin(this.world.grid, me.ghost) !== null;
    }
    if (!me?.alive) return false;
    if (this.world.bombs.some((b) => b.remote === true && b.ownerId === 0)) return true;
    const mount = me.mount === null ? undefined : mounts.get(me.mount);
    return mount?.ability === 'jump' && me.abilityCooldown === 0 && me.jump === null;
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

  private syncPlayers(): void {
    this.world.players.forEach((p, i) => {
      const sprite = this.playerSprites[i];
      if (!sprite) return;
      if (p.ghost) {
        // Fantasma: pequeno e translúcido, sobre o anel da borda.
        const at = ringPoint(this.world.grid, p.ghost.s);
        const gp = this.toScreen(at.x, at.y);
        sprite.setPosition(gp.x, gp.y).setScale(0.7);
        sprite.setFillStyle(PLAYER_COLORS[p.id] ?? UNKNOWN_COLOR, 0.45);
        sprite.setStrokeStyle(2, 0xffffff, p.ghost.thrown ? 0.3 : 0.9);
        this.mountSprites[i]?.setVisible(false);
        return;
      }
      const pos = this.toScreen(p.x, p.y);
      const moved = this.lastPositions[i * 2] !== p.x || this.lastPositions[i * 2 + 1] !== p.y;
      this.lastPositions[i * 2] = p.x;
      this.lastPositions[i * 2 + 1] = p.y;

      // Mato alto: o jogador local se vê meio transparente; os outros, só o contorno ao se mexer.
      const id = this.world.grid.tiles[Math.round(p.y) * this.world.grid.cols + Math.round(p.x)];
      const hidden = p.alive && id !== undefined && this.world.terrains.get(id)?.hides === true;
      let fill = p.alive ? 1 : 0.3;
      let stroke = fill;
      if (hidden && p.id === 0) fill = stroke = 0.5;
      else if (hidden) {
        fill = 0;
        stroke = moved ? 0.8 : 0;
      }
      // Pulo: cresce no meio do arco. Invulnerável: pisca.
      const jump = p.jump;
      const arc = jump ? Math.sin(Math.PI * (1 - jump.ticksLeft / jump.totalTicks)) : 0;
      if (p.invulnerableTicks > 0 && Math.floor(this.world.tick / 4) % 2 === 0)
        fill = stroke = 0.25;
      sprite
        .setPosition(pos.x, pos.y - arc * TILE * 0.4)
        .setAlpha(1)
        .setScale(1 + arc * 0.35);
      const mountSprite = this.mountSprites[i];
      if (mountSprite) {
        const color = p.mount === null ? undefined : MOUNT_COLORS[p.mount];
        mountSprite
          .setVisible(p.alive && color !== undefined && !(hidden && p.id !== 0))
          .setFillStyle(color ?? 0xffffff, hidden ? 0.5 : 1)
          .setPosition(pos.x, pos.y + TILE * 0.32 - arc * TILE * 0.4)
          .setScale(1 + arc * 0.35);
      }
      sprite.setFillStyle(PLAYER_COLORS[p.id] ?? UNKNOWN_COLOR, fill);
      sprite.setStrokeStyle(2, 0xffffff, stroke);
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

    this.world.items.forEach((itemId, i) => {
      if (itemId === null) return;
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

    // Bombas de fantasma em voo: arco do anel até o pouso.
    for (const p of this.world.players) {
      const f = p.ghost?.flight;
      if (!f) continue;
      const t = 1 - f.ticksLeft / f.totalTicks;
      const at = this.toScreen(f.fromX + (f.toX - f.fromX) * t, f.fromY + (f.toY - f.fromY) * t);
      g.fillStyle(BOMB_COLOR);
      g.fillCircle(at.x, at.y - Math.sin(Math.PI * t) * TILE * 0.9, TILE * 0.3);
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
      g.fillStyle(BOMB_COLOR);
      g.fillCircle(pos.x, pos.y, TILE * 0.36 * pulse);
      g.fillStyle(BOMB_FUSE_COLOR);
      g.fillCircle(pos.x + TILE * 0.2, pos.y - TILE * 0.24, TILE * 0.08);
    }
  }
}
