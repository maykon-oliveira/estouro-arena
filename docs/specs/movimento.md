# Movimento e assistência de curva

**Status:** feita (commit 1f2831d). GDD §2 (movimento livre com encaixe nos corredores).

## Regras

- **Tick fixo:** `createFixedStep(tickRate, maxTicksPerFrame)` converte o tempo real em ticks; acima do teto por quadro, o atraso é descartado (sem rajada após pausa). `step(world, commands)` avança exatamente 1 tick.
- **Posição** contínua em tiles; inteiros = centro do tile. O tile "do jogador" é a posição arredondada.
- **Comando `move { playerId, dir | null }`:** define a direção segurada, que vale até o próximo `move`.
- **Por tick**, a verba de movimento é `playerSpeed × speedMultiplier(tile atual) ÷ tickRate`.
- **Só em eixo:** andar na horizontal exige `y` alinhado, e vice-versa.
- **Avanço:** pode ir até o centro do tile atual; passar dele só se o próximo tile for `walkable` e não tiver bomba.
- **Assistência de curva:** fora do eixo, procura entre as duas faixas vizinhas (floor/ceil) as que estão a ≤ `player.cornerAssistTiles` (0,5) e cujo tile à frente é enterável; escolhe a mais próxima e desliza até ela. A sobra da verba no mesmo tick vira avanço. Sem faixa válida → não se move.
- `facing` muda para a direção pedida mesmo bloqueado.
- **Entrada:** teclado (setas/WASD; vale a última tecla pressionada; `blur` solta tudo) e joystick (ver [controles-touch](controles-touch.md)), combinados por `PlayerInput`, que só emite `move` quando a direção muda.

## Casos de borda

- Exatamente a meio caminho entre faixas (0,5/0,5): as duas são candidatas; vence a de menor índice se ambas forem válidas.
- Erro de ponto flutuante: alinhamento com tolerância de 1e-6 e encaixe exato na faixa.
- Jogador morto não se move.

## Eventos

Nenhum (o render lê a posição do estado).

## Dados

`tickRate`, `maxTicksPerFrame`, `player.speedTilesPerSecond`, `player.cornerAssistTiles`.

## Testes

[`tests/core/movement.test.ts`](../../tests/core/movement.test.ts), [`tests/core/fixedStep.test.ts`](../../tests/core/fixedStep.test.ts), [`tests/input/DirectionStack.test.ts`](../../tests/input/DirectionStack.test.ts), [`tests/input/PlayerInput.test.ts`](../../tests/input/PlayerInput.test.ts).

## Pendências

- A checagem de assistência ignora bomba no tile da faixa *atual*. Num caso raro, isso deixaria o jogador deslizar lateralmente para dentro de uma bomba alheia.
- Ajustar `cornerAssistTiles` testando no celular real.
- Gamepad.
