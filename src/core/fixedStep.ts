/**
 * Converte o tempo real entre quadros em ticks fixos da simulação.
 * O atraso acima de `maxTicksPerFrame` é descartado (após pausa ou aba em segundo plano),
 * em vez de rodar uma rajada de ticks.
 */
export interface FixedStep {
  /** Soma `deltaMs` e devolve quantos ticks rodar agora. */
  advance(deltaMs: number): number;
}

export function createFixedStep(tickRate: number, maxTicksPerFrame: number): FixedStep {
  // Acumula em ticks (não em ms) e tolera erro de ponto flutuante: 1000 ms a 60/s dá 60, não 59.
  const EPSILON = 1e-9;
  let accumulator = 0;

  return {
    advance(deltaMs) {
      accumulator += (Math.max(0, deltaMs) * tickRate) / 1000;
      let ticks = Math.floor(accumulator + EPSILON);
      if (ticks > maxTicksPerFrame) {
        ticks = maxTicksPerFrame;
        accumulator = 0;
      } else {
        accumulator = Math.max(0, accumulator - ticks);
      }
      return ticks;
    },
  };
}
