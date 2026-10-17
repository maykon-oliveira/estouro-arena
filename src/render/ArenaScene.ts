import Phaser from 'phaser';
import { SilentAudio } from '../audio/AudioService';
import { EventSounds } from '../audio/EventSounds';
import type { Command } from '../core/commands';
import { createFixedStep, type FixedStep } from '../core/fixedStep';
import { countSpawns } from '../core/grid';
import { BLOCK } from '../core/terrainIds';
import { createMatch, stepMatch, type Match } from '../core/match';
import type { World } from '../core/world';
import { gameConfig, maps, sounds, terrains } from '../data';
import { matchRulesFromConfig, rulesFromConfig } from '../data/rules';
import type { GameEvent } from '../events';
import type { PlayerInput } from '../input/PlayerInput';
import type { DebugPanel } from '../ui/DebugPanel';
import { debugInfo } from '../ui/debugInfo';
import { MatchHud } from '../ui/MatchHud';
import { DebugOverlay } from './DebugOverlay';

// Placeholder da Fase 0: formas coloridas até existir o manifest do tema.
const PLACEHOLDER_COLORS: Readonly<Record<string, number>> = {
  chao: 0x2e7d32,
  parede: 0x4a4a6a,
  bloco: 0xa1887f,
};
const UNKNOWN_COLOR = 0xff00ff;
const SPAWN_COLOR = 0xffeb3b;
const PLAYER_COLORS = gameConfig.render.playerColors.map((hex) => parseInt(hex.slice(1), 16));
const BOMB_COLOR = 0x111111;
const BOMB_FUSE_COLOR = 0xffa000;
const FLAME_OUTER = 0xff6d00;
const FLAME_INNER = 0xffe082;

const TILE = gameConfig.render.tileSize;

const randomSeed = (): number => Math.floor(Math.random() * 2 ** 32);

/** `?seed=N` fixa o sorteio dos blocos; sem ele, cada carga gera um mapa novo. */
function readSeed(): number {
  const param = new URLSearchParams(window.location.search).get('seed');
  const seed = param === null ? NaN : Number(param);
  return Number.isInteger(seed) ? seed : randomSeed();
}

/** `?bots=N` (1–3, padrão 3) até existir o menu de batalha. */
function readBots(): number {
  const bots = Number(new URLSearchParams(window.location.search).get('bots') ?? 3);
  return Number.isInteger(bots) ? Math.min(3, Math.max(1, bots)) : 3;
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
  private readonly gameEvents: GameEvent[] = [];
  private readonly eventSounds = new EventSounds(new SilentAudio(), sounds);
  private gridLayer!: Phaser.GameObjects.Graphics;
  private dynamicLayer!: Phaser.GameObjects.Graphics;
  private playerSprites: Phaser.GameObjects.Arc[] = [];
  private origin = { x: 0, y: 0 };
  private seed = 0;
  private mapId = '';
  private debugOverlay: DebugOverlay | null = null;

  /** `playerInput` gera os comandos do jogador local (id 0); `debug` só existe com ?debug=1. */
  constructor(
    private readonly playerInput: PlayerInput,
    private readonly debug: DebugPanel | null = null,
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
    const map = maps.get(gameConfig.map.default);
    if (!map) throw new Error(`Mapa não encontrado: ${gameConfig.map.default}`);

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
        // Spawns limitam a partida: 1 jogador + até 3 bots.
        players: Math.min(1 + readBots(), countSpawns(map)),
      },
      this.gameEvents,
    );
    console.info(`[arena] mapa ${map.id}, seed ${seed}`);
    // Só em dev: inspeção pelo console e pelos testes e2e. Nunca escrever na partida por aqui.
    if (import.meta.env.DEV) Object.assign(window, { __arena: this.match });

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
    const ticks = this.stepper.advance(deltaMs);
    for (let i = 0; i < ticks; i++) {
      // Comandos entram no primeiro tick do quadro; os demais ticks seguem com a direção segurada.
      stepMatch(this.match, i === 0 ? this.commands : [], this.gameEvents);
    }
    if (ticks > 0) this.commands.length = 0;

    this.handleEvents();
    this.hud?.update(this.match, this.time.now);
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
      if (e.type === 'bloco.destruido' || e.type === 'rodada.contagem') gridChanged = true;
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
      sprite.setPosition(pos.x, pos.y).setAlpha(p.alive ? 1 : 0.3);
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

    for (const bomb of this.world.bombs) {
      const pos = this.toScreen(bomb.x, bomb.y);
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
