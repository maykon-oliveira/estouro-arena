import Phaser from 'phaser';
import { SilentAudio } from '../audio/AudioService';
import { EventSounds } from '../audio/EventSounds';
import type { Command } from '../core/commands';
import { createBot, runBots, type Bot } from '../core/bots/bot';
import { DIRECTION_VECTORS } from '../core/direction';
import { createFixedStep, type FixedStep } from '../core/fixedStep';
import { countSpawns } from '../core/grid';
import { BLOCK } from '../core/terrainIds';
import { createMatch, stepMatch, type Match } from '../core/match';
import type { World } from '../core/world';
import { botConfigs, gameConfig, items, maps, sounds, terrains } from '../data';
import { matchRulesFromConfig, rulesFromConfig } from '../data/rules';
import type { GameEvent } from '../events';
import type { PlayerInput } from '../input/PlayerInput';
import type { TouchControls } from '../input/TouchControls';
import type { DebugPanel } from '../ui/DebugPanel';
import { debugInfo } from '../ui/debugInfo';
import { MatchHud } from '../ui/MatchHud';
import { DebugOverlay } from './DebugOverlay';

// Placeholder da Fase 0: formas coloridas até existir o manifest do tema.
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

const TILE = gameConfig.render.tileSize;

const randomSeed = (): number => Math.floor(Math.random() * 2 ** 32);

/** `?seed=N` fixa o sorteio dos blocos; sem ele, cada carga gera um mapa novo. */
function readSeed(): number {
  const param = new URLSearchParams(window.location.search).get('seed');
  const seed = param === null ? NaN : Number(param);
  return Number.isInteger(seed) ? seed : randomSeed();
}

/** `?map=<id>` escolhe a fase até existir o menu de batalha; id desconhecido → padrão. */
function readMapId(): string {
  const id = new URLSearchParams(window.location.search).get('map');
  return id !== null && maps.has(id) ? id : gameConfig.map.default;
}

/** `?bots=N` (1–3, padrão 3) até existir o menu de batalha. */
function readBots(): number {
  const bots = Number(new URLSearchParams(window.location.search).get('bots') ?? 3);
  return Number.isInteger(bots) ? Math.min(3, Math.max(1, bots)) : 3;
}

/** `?nivel=facil|medio|dificil` (padrão `medio`) até existir o menu de batalha. */
function readBotLevel(): string {
  const level = new URLSearchParams(window.location.search).get('nivel');
  return level !== null && botConfigs.has(level) ? level : 'medio';
}

/** `?ia=0` deixa os adversários parados (para testes e depuração). */
function botsEnabled(): boolean {
  return new URLSearchParams(window.location.search).get('ia') !== '0';
}

interface ArenaSceneData {
  /** Seed da partida; ausente na primeira carga (vem da URL ou é sorteada). */
  seed?: number;
}

export class ArenaScene extends Phaser.Scene {
  private match!: Match;
  private hud: MatchHud | null = null;
  private requestedSeed: number | undefined;
  private stepper!: FixedStep;
  private readonly commands: Command[] = [];
  /** Comandos de um tick (jogador local + bots), reaproveitado para não alocar por tick. */
  private readonly tickCommands: Command[] = [];
  private bots: Bot[] = [];
  private readonly gameEvents: GameEvent[] = [];
  private readonly eventSounds = new EventSounds(new SilentAudio(), sounds);
  private gridLayer!: Phaser.GameObjects.Graphics;
  private dynamicLayer!: Phaser.GameObjects.Graphics;
  private playerSprites: Phaser.GameObjects.Arc[] = [];
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

  init(data: ArenaSceneData): void {
    this.requestedSeed = data.seed;
  }

  create(): void {
    const mapId = readMapId();
    const map = maps.get(mapId);
    if (!map) throw new Error(`Mapa não encontrado: ${mapId}`);

    const seed = this.requestedSeed ?? readSeed();
    this.seed = seed;
    this.mapId = map.id;
    this.commands.length = 0;
    this.gameEvents.length = 0;
    this.match = createMatch(
      {
        map,
        terrains,
        rules: rulesFromConfig(gameConfig),
        matchRules: matchRulesFromConfig(gameConfig),
        seed,
        items,
        defaultItems: gameConfig.items.defaultDistribution,
        // Spawns limitam a partida: 1 jogador + até 3 bots.
        players: Math.min(1 + readBots(), countSpawns(map)),
      },
      this.gameEvents,
    );
    console.info(`[arena] mapa ${map.id}, seed ${seed}`);
    // Só em dev: inspeção pelo console e pelos testes e2e. Nunca escrever na partida por aqui.
    if (import.meta.env.DEV) Object.assign(window, { __arena: this.match });

    const botConfig = botConfigs.get(readBotLevel());
    if (!botConfig) throw new Error('nível de bot não encontrado');
    // Jogador local = id 0; os demais são bots.
    this.bots = botsEnabled()
      ? this.world.players.slice(1).map((p) => createBot(p.id, botConfig, seed))
      : [];

    this.stepper = createFixedStep(gameConfig.tickRate, gameConfig.maxTicksPerFrame);
    this.hud = new MatchHud(document.body, this.world.players.length);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hud?.destroy();
      this.hud = null;
      this.stopWaitingRestart();
    });

    const { width, height } = this.scale.gameSize;
    this.origin = {
      x: Math.floor((width - this.world.grid.cols * TILE) / 2),
      y: Math.floor((height - this.world.grid.rows * TILE) / 2),
    };

    this.gridLayer = this.add.graphics();
    this.dynamicLayer = this.add.graphics();
    this.debugOverlay = this.debug
      ? new DebugOverlay(this.add.graphics(), this.origin, TILE)
      : null;
    this.drawGrid();
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
    // Botão de ação aceso só quando há o que fazer (hoje: bomba remota do jogador no mapa).
    this.touch?.setActionAvailable(
      this.world.bombs.some((b) => b.remote === true && b.ownerId === 0),
    );
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
        e.type === 'rodada.contagem'
      ) {
        gridChanged = true;
      }
      if (e.type === 'partida.terminou') this.waitRestart();
    }
    if (gridChanged) this.drawGrid();
    this.gameEvents.length = 0;
  }

  /** Fim da partida: toque, clique ou Enter recomeça com seed nova (até existir o menu). */
  private readonly onRestartKey = (e: KeyboardEvent): void => {
    if (e.code === 'Enter') this.restartMatch();
  };
  private readonly onRestartPointer = (): void => this.restartMatch();

  private waitRestart(): void {
    window.addEventListener('keydown', this.onRestartKey);
    window.addEventListener('pointerdown', this.onRestartPointer);
  }

  private stopWaitingRestart(): void {
    window.removeEventListener('keydown', this.onRestartKey);
    window.removeEventListener('pointerdown', this.onRestartPointer);
  }

  private restartMatch(): void {
    this.stopWaitingRestart();
    this.scene.restart({ seed: randomSeed() } satisfies ArenaSceneData);
  }

  private toScreen(x: number, y: number): { x: number; y: number } {
    return { x: this.origin.x + (x + 0.5) * TILE, y: this.origin.y + (y + 0.5) * TILE };
  }

  private syncPlayers(): void {
    this.world.players.forEach((p, i) => {
      const sprite = this.playerSprites[i];
      if (!sprite) return;
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
      sprite.setPosition(pos.x, pos.y).setAlpha(1);
      sprite.setFillStyle(PLAYER_COLORS[p.id] ?? UNKNOWN_COLOR, fill);
      sprite.setStrokeStyle(2, 0xffffff, stroke);
    });
  }

  private drawGrid(): void {
    const { cols, tiles, spawns } = this.world.grid;
    const g = this.gridLayer.clear();

    tiles.forEach((id, i) => {
      const x = this.origin.x + (i % cols) * TILE;
      const y = this.origin.y + Math.floor(i / cols) * TILE;
      g.fillStyle(PLACEHOLDER_COLORS[id] ?? UNKNOWN_COLOR);
      g.fillRect(x, y, TILE, TILE);
      if (id === BLOCK) {
        g.lineStyle(2, 0x6d4c41);
        g.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
      }
      const terrain = this.world.terrains.get(id);
      if (terrain?.hides) {
        // Touceiras: traços verticais claros.
        g.lineStyle(2, 0x66bb6a, 0.9);
        for (let k = 1; k <= 3; k++) {
          g.lineBetween(x + (k * TILE) / 4, y + TILE - 4, x + (k * TILE) / 4 - 2, y + 6);
        }
      } else if (terrain?.slippery) {
        // Brilho diagonal do gelo.
        g.lineStyle(2, 0xffffff, 0.8);
        g.lineBetween(x + 6, y + TILE - 8, x + TILE - 8, y + 6);
      }
    });

    g.fillStyle(SPAWN_COLOR, 0.35);
    for (const s of spawns) {
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

    this.world.items.forEach((itemId, i) => {
      if (itemId === null) return;
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
