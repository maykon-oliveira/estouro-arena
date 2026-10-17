# Bomba e explosão

**Status:** feita (commit 5550d1f). GDD §2 (bomba, vida).

## Regras

- **Comando `bomb { playerId }`:** solta uma bomba no tile do jogador (posição arredondada). Só se:
  - o jogador está vivo;
  - tem bombas ativas < `maxBombs` (`player.startBombs`);
  - o terreno tem `allowsBomb`;
  - não há bomba no tile.
- A bomba guarda `range` do dono (`player.startRange`) e `fuse` = `bomb.fuseMs` em ticks.
- **Ordem do tick** ([`step`](../../src/core/world.ts)): comandos → movimento → bombas/chamas → mortes.
- **Bombas/chamas** ([`updateBombs`](../../src/core/bombs.ts)), nesta ordem:
  1. Decrementa as chamas. Tile destrutível cuja chama chega a 0 vira `chao` (`bloco.destruido`).
  2. Decrementa os pavios.
  3. Detona, em fila, as bombas com pavio ≤ 0 ou sobre chama ativa; bombas atingidas entram na fila (**cadeia no mesmo tick**).
- **Cruz:** o centro mais até `range` tiles por direção. O fogo:
  - para **antes** de terreno com `blocksFire` não destrutível (parede);
  - inclui e para em terreno destrutível (bloco);
  - inclui e para em bomba, que detona.
- Chama dura `bomb.explosionMs` (em ticks) por tile; sobreposição usa o maior restante.
- **Bloco atingido** continua `bloco` (bloqueia andar e fogo) enquanto queima; só vira chão quando a chama apaga. Assim, duas explosões simultâneas não atravessam o mesmo bloco.
- **Movimento:** bomba barra quem tenta *entrar* no tile; quem está em cima sai normalmente. Depois que o jogador sai do tile (posição arredondada mudou), não volta.
- **Morte:** jogador vivo cujo tile tem chama morre (`alive = false`, direção zerada) e passa a ignorar comandos.
- O fim da rodada (vitória, empate) é da [partida e rodadas](partida-e-rodadas.md); a Fase 0 reiniciava a arena sozinha após a morte.

## Casos de borda

- Bomba no meio de dois tiles → vai para o mais próximo.
- Segunda bomba no mesmo tile ou além do limite → ignorada, sem evento.
- Água rasa (`allowsBomb: false`) → ignorada.
- Bomba sobre chama ativa detona no mesmo tick (hoje inalcançável: quem está na chama já morreu; vale para chutes no futuro).
- O próprio dono morre na explosão se ficar na cruz.

## Eventos ([`src/events.ts`](../../src/events.ts))

| Evento | Quando | Dados |
| --- | --- | --- |
| `bomba.colocada` | bomba aceita | `bombId, playerId, x, y` |
| `bomba.explodiu` | cada detonação, inclusive em cadeia | `bombId, x, y, tiles` |
| `bloco.destruido` | bloco termina de queimar e vira chão | `x, y` |
| `jogador.morreu` | jogador entra/fica em chama | `playerId` |

Sons: [`src/data/sounds.json`](../../src/data/sounds.json) → `EventSounds` → `SilentAudio`.

## Dados

`bomb.fuseMs` (2500), `bomb.explosionMs` (500), `player.startBombs` (1), `player.startRange` (2).

## Testes

[`tests/core/bombs.test.ts`](../../tests/core/bombs.test.ts), [`tests/audio/EventSounds.test.ts`](../../tests/audio/EventSounds.test.ts).

## Pendências

- Itens soltos pelo bloco destruído; power-ups de bomba e fogo — Fase 1.
- Chute, luva, bomba remota e perfurante.
- Vibração ao explodir e ao morrer — Fase 3.
