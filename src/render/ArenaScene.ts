import Phaser from 'phaser';
import type { Command } from '../core/commands';
import { createFixedStep, type FixedStep } from '../core/fixedStep';
import { BLOCK } from '../core/terrainIds';
import { createWorld, step, type World } from '../core/world';
import { gameConfig, maps, terrains } from '../data';
import { KeyboardInput } from '../input/KeyboardInput';

// Placeholder da Fase 0: formas coloridas por terreno até existir o manifest do tema.
const PLACEHOLDER_COLORS: Readonly<Record<string, number>> = {
  chao: 0x2e7d32,
  parede: 0x4a4a6a,
  bloco: 0xa1887f,
};
const UNKNOWN_COLOR = 0xff00ff;
const SPAWN_COLOR = 0xffeb3b;
const PLAYER_COLOR = 0xe53935; // gorro do Saci

const TILE = gameConfig.render.tileSize;
const LOCAL_PLAYER = 0;

/** `?seed=N` fixa o sorteio dos blocos; sem ele, cada carga gera um mapa novo. */
function readSeed(): number {
  const param = new URLSearchParams(window.location.search).get('seed');
  const seed = param === null ? NaN : Number(param);
  return Number.isInteger(seed) ? seed : Math.floor(Math.random() * 2 ** 32);
}

export class ArenaScene extends Phaser.Scene {
  private world!: World;
  private stepper!: FixedStep;
  private keyboard!: KeyboardInput;
  private readonly commands: Command[] = [];
  private playerSprites: Phaser.GameObjects.Arc[] = [];
  private origin = { x: 0, y: 0 };

  constructor() {
    super('arena');
  }

  create(): void {
    const map = maps.get(gameConfig.map.default);
    if (!map) throw new Error(`Mapa não encontrado: ${gameConfig.map.default}`);

    const seed = readSeed();
    this.world = createWorld({
      map,
      terrains,
      seed,
      players: 1,
      rules: {
        tickRate: gameConfig.tickRate,
        playerSpeed: gameConfig.player.speedTilesPerSecond,
        cornerAssistTiles: gameConfig.player.cornerAssistTiles,
        spawnSafeRadius: gameConfig.map.spawnSafeRadius,
      },
    });
    console.info(`[arena] mapa ${map.id}, seed ${seed}`);
    // Só em dev: inspeção pelo console e pelos testes e2e. Nunca escrever no mundo por aqui.
    if (import.meta.env.DEV) Object.assign(window, { __arena: this.world });

    this.stepper = createFixedStep(gameConfig.tickRate, gameConfig.maxTicksPerFrame);
    this.keyboard = new KeyboardInput(LOCAL_PLAYER);

    const { width, height } = this.scale.gameSize;
    this.origin = {
      x: Math.floor((width - this.world.grid.cols * TILE) / 2),
      y: Math.floor((height - this.world.grid.rows * TILE) / 2),
    };

    this.drawGrid();
    this.playerSprites = this.world.players.map(() =>
      this.add.circle(0, 0, TILE * 0.4, PLAYER_COLOR).setStrokeStyle(2, 0xffffff),
    );
    this.syncPlayers();
  }

  override update(_time: number, deltaMs: number): void {
    this.keyboard.poll(this.commands);
    const ticks = this.stepper.advance(deltaMs);
    for (let i = 0; i < ticks; i++) {
      // Comandos entram no primeiro tick do quadro; os demais ticks seguem com a direção segurada.
      step(this.world, i === 0 ? this.commands : []);
    }
    if (ticks > 0) this.commands.length = 0;
    this.syncPlayers();
  }

  private toScreen(x: number, y: number): { x: number; y: number } {
    return { x: this.origin.x + (x + 0.5) * TILE, y: this.origin.y + (y + 0.5) * TILE };
  }

  private syncPlayers(): void {
    this.world.players.forEach((p, i) => {
      const pos = this.toScreen(p.x, p.y);
      this.playerSprites[i]?.setPosition(pos.x, pos.y);
    });
  }

  private drawGrid(): void {
    const { cols, tiles, spawns } = this.world.grid;
    const g = this.add.graphics();

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
}
