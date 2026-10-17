import Phaser from 'phaser';
import { SilentAudio } from '../audio/AudioService';
import { EventSounds } from '../audio/EventSounds';
import type { Command } from '../core/commands';
import { createFixedStep, type FixedStep } from '../core/fixedStep';
import { BLOCK } from '../core/terrainIds';
import { createWorld, step, type World } from '../core/world';
import { gameConfig, maps, sounds, terrains } from '../data';
import { rulesFromConfig } from '../data/rules';
import type { GameEvent } from '../events';
import type { PlayerInput } from '../input/PlayerInput';
import type { DebugPanel } from '../ui/DebugPanel';
import { debugInfo } from '../ui/debugInfo';
import { DebugOverlay } from './DebugOverlay';

// Placeholder da Fase 0: formas coloridas até existir o manifest do tema.
const PLACEHOLDER_COLORS: Readonly<Record<string, number>> = {
  chao: 0x2e7d32,
  parede: 0x4a4a6a,
  bloco: 0xa1887f,
};
const UNKNOWN_COLOR = 0xff00ff;
const SPAWN_COLOR = 0xffeb3b;
const PLAYER_COLOR = 0xe53935; // gorro do Saci
const BOMB_COLOR = 0x111111;
const BOMB_FUSE_COLOR = 0xffa000;
const FLAME_OUTER = 0xff6d00;
const FLAME_INNER = 0xffe082;

const TILE = gameConfig.render.tileSize;

/** `?seed=N` fixa o sorteio dos blocos; sem ele, cada carga gera um mapa novo. */
function readSeed(): number {
  const param = new URLSearchParams(window.location.search).get('seed');
  const seed = param === null ? NaN : Number(param);
  return Number.isInteger(seed) ? seed : Math.floor(Math.random() * 2 ** 32);
}

export class ArenaScene extends Phaser.Scene {
  private world!: World;
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

  create(): void {
    const map = maps.get(gameConfig.map.default);
    if (!map) throw new Error(`Mapa não encontrado: ${gameConfig.map.default}`);

    const seed = readSeed();
    this.seed = seed;
    this.mapId = map.id;
    this.world = createWorld({
      map,
      terrains,
      seed,
      players: 1,
      rules: rulesFromConfig(gameConfig),
    });
    console.info(`[arena] mapa ${map.id}, seed ${seed}`);
    // Só em dev: inspeção pelo console e pelos testes e2e. Nunca escrever no mundo por aqui.
    if (import.meta.env.DEV) Object.assign(window, { __arena: this.world });

    this.stepper = createFixedStep(gameConfig.tickRate, gameConfig.maxTicksPerFrame);
    this.commands.length = 0;
    this.gameEvents.length = 0;

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
    this.playerSprites = this.world.players.map(() =>
      this.add.circle(0, 0, TILE * 0.4, PLAYER_COLOR).setStrokeStyle(2, 0xffffff),
    );
    this.syncPlayers();
  }

  override update(_time: number, deltaMs: number): void {
    this.playerInput.poll(this.commands);
    const ticks = this.stepper.advance(deltaMs);
    for (let i = 0; i < ticks; i++) {
      // Comandos entram no primeiro tick do quadro; os demais ticks seguem com a direção segurada.
      step(this.world, i === 0 ? this.commands : [], this.gameEvents);
    }
    if (ticks > 0) this.commands.length = 0;

    this.handleEvents();
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
    let gridChanged = false;
    for (const e of this.gameEvents) {
      if (e.type === 'bloco.destruido') gridChanged = true;
      // Fase 0: sem menus ainda; a arena recomeça sozinha após a morte.
      if (e.type === 'jogador.morreu') {
        this.time.delayedCall(gameConfig.match.restartDelayMs, () => this.scene.restart());
      }
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
