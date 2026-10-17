// Tipos de todos os eventos emitidos pela simulação (src/core).
// Render, áudio e rede apenas escutam; nunca alteram o estado.
// Os eventos concretos (bomba.explodiu, jogador.morreu…) entram junto com cada feature.
export type GameEvent = never;
