/** Converte milissegundos (como ficam nos JSON) em ticks da simulação. */
export function msToTicks(ms: number, tickRate: number): number {
  return Math.round((ms * tickRate) / 1000);
}
