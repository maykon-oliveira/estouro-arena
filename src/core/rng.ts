/**
 * Gerador pseudoaleatório determinístico (mulberry32).
 * O core nunca usa Math.random: a mesma seed sempre produz a mesma partida.
 */
export interface Rng {
  /** Número em [0, 1). */
  next(): number;
  /** Inteiro em [min, max]. */
  int(min: number, max: number): number;
  /** Estado interno, para salvar/restaurar (replays). */
  readonly state: number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;

  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    get state() {
      return s;
    },
  };
}
