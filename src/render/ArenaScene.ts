import Phaser from 'phaser';
import { generateGrid, type Grid } from '../core/grid';
import { createRng } from '../core/rng';
import { BLOCK } from '../core/terrainIds';
import { gameConfig, maps } from '../data';

// Placeholder da Fase 0: formas coloridas por terreno até existir o manifest do tema.
const PLACEHOLDER_COLORS: Readonly<Record<string, number>> = {
  chao: 0x2e7d32,
  parede: 0x4a4a6a,
  bloco: 0xa1887f,
};
const UNKNOWN_COLOR = 0xff00ff;
const SPAWN_COLOR = 0xffeb3b;

const TILE = gameConfig.render.tileSize;

/** `?seed=N` fixa o sorteio dos blocos; sem ele, cada carga gera um mapa novo. */
function readSeed(): number {
  const param = new URLSearchParams(window.location.search).get('seed');
  const seed = param === null ? NaN : Number(param);
  return Number.isInteger(seed) ? seed : Math.floor(Math.random() * 2 ** 32);
}

export class ArenaScene extends Phaser.Scene {
  private grid!: Grid;

  constructor() {
    super('arena');
  }

  create(): void {
    const map = maps.get(gameConfig.map.default);
    if (!map) throw new Error(`Mapa não encontrado: ${gameConfig.map.default}`);

    const seed = readSeed();
    this.grid = generateGrid(map, createRng(seed), gameConfig.map.spawnSafeRadius);
    console.info(`[arena] mapa ${map.id}, seed ${seed}`);

    this.drawGrid();
  }

  private drawGrid(): void {
    const { cols, rows, tiles, spawns } = this.grid;
    const { width, height } = this.scale.gameSize;
    const offsetX = Math.floor((width - cols * TILE) / 2);
    const offsetY = Math.floor((height - rows * TILE) / 2);
    const g = this.add.graphics();

    tiles.forEach((id, i) => {
      const x = i % cols;
      const y = Math.floor(i / cols);
      g.fillStyle(PLACEHOLDER_COLORS[id] ?? UNKNOWN_COLOR);
      g.fillRect(offsetX + x * TILE, offsetY + y * TILE, TILE, TILE);
      if (id === BLOCK) {
        g.lineStyle(2, 0x6d4c41);
        g.strokeRect(offsetX + x * TILE + 1, offsetY + y * TILE + 1, TILE - 2, TILE - 2);
      }
    });

    g.fillStyle(SPAWN_COLOR);
    for (const s of spawns) {
      g.fillCircle(offsetX + s.x * TILE + TILE / 2, offsetY + s.y * TILE + TILE / 2, TILE / 4);
    }
  }
}
