import type { MapDefinition, Point } from './grid';
import { FLOOR, SPAWN } from './terrainIds';
import type { TerrainRules } from './world';

const NEIGHBORS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

/** Mínimo de spawns de uma fase (partida de 4). */
const MIN_SPAWNS = 4;
/** Tiles andáveis mínimos na área segura: o spawn + 2 (solta ao lado, esconde no outro). */
const MIN_SAFE_TILES = 3;

/**
 * Confere se a fase é jogável antes de sortear blocos: spawns suficientes, área segura onde dá
 * para soltar a primeira bomba e se esconder, e todos os spawns ligados (blocos e mato contam
 * como passagem, porque serão quebrados). Devolve as mensagens de erro (vazio = ok).
 */
export function checkMapLayout(
  map: MapDefinition,
  terrains: ReadonlyMap<string, TerrainRules>,
  spawnSafeRadius: number,
): string[] {
  const [cols, rows] = map.tamanho;
  const tiles: string[] = [];
  const spawns: Point[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const id = map.legenda[map.mapa[y]?.[x] ?? ''] ?? FLOOR;
      if (id === SPAWN) spawns.push({ x, y });
      tiles.push(id === SPAWN ? FLOOR : id);
    }
  }
  const terrainAt = (x: number, y: number): TerrainRules | undefined =>
    x < 0 || y < 0 || x >= cols || y >= rows ? undefined : terrains.get(tiles[y * cols + x] ?? '');

  const errors: string[] = [];
  if (spawns.length < MIN_SPAWNS) {
    errors.push(`precisa de pelo menos ${MIN_SPAWNS} spawns (tem ${spawns.length})`);
  }

  for (const s of spawns) {
    let walkable = 0;
    for (let y = s.y - spawnSafeRadius; y <= s.y + spawnSafeRadius; y++) {
      for (let x = s.x - spawnSafeRadius; x <= s.x + spawnSafeRadius; x++) {
        if (Math.abs(x - s.x) + Math.abs(y - s.y) > spawnSafeRadius) continue;
        const t = terrainAt(x, y);
        if (!t?.walkable) continue;
        walkable++;
        if (!t.allowsBomb || t.slippery) {
          errors.push(
            `área segura do spawn (${s.x},${s.y}) tem tile sem bomba ou escorregadio em (${x},${y})`,
          );
        }
      }
    }
    if (walkable < MIN_SAFE_TILES) {
      errors.push(
        `área segura do spawn (${s.x},${s.y}) tem só ${walkable} tiles andáveis (mínimo ${MIN_SAFE_TILES})`,
      );
    }
  }

  const first = spawns[0];
  if (first) {
    const seen = new Uint8Array(cols * rows);
    const queue: Point[] = [first];
    seen[first.y * cols + first.x] = 1;
    for (let p = queue.shift(); p; p = queue.shift()) {
      for (const [dx, dy] of NEIGHBORS) {
        const x = p.x + dx;
        const y = p.y + dy;
        const t = terrainAt(x, y);
        if (!t || seen[y * cols + x] || !(t.walkable || t.destructible)) continue;
        seen[y * cols + x] = 1;
        queue.push({ x, y });
      }
    }
    const isolated = spawns.filter((s) => !seen[s.y * cols + s.x]);
    if (isolated.length > 0) {
      const list = isolated.map((s) => `(${s.x},${s.y})`).join(', ');
      errors.push(`spawns isolados: ${list} não alcançam (${first.x},${first.y})`);
    }
  }
  return errors;
}
