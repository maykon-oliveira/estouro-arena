# Fantasma vingador

**Status:** feita (Fase 1, passo 9). GDD §5 ("quem morre vira fantasma na borda e pode arremessar 1 bomba por rodada"). Depende de [partida e rodadas](partida-e-rodadas.md).

## Regras

- `ghost.delayMs` (1500) depois de morrer, o jogador (humano ou bot) vira fantasma (`fantasma.surgiu`) num tile do **anel da borda** (linha/coluna mais externa da grade), o mais perto de onde morreu.
- **Movimento:** o fantasma anda só pelo anel, a `ghost.speedTilesPerSecond` (3), ignorando terreno, bombas e chamas. A posição é um parâmetro ao longo do perímetro, no sentido horário a partir do canto superior esquerdo. No joystick, a direção que segue o lado atual move (no lado de cima: → horário, ← anti-horário; à direita: ↓ horário; embaixo: ← horário; à esquerda: ↑ horário); a direção perpendicular não move. Nas quinas o parâmetro continua, então ele vira sozinho.
- **Arremesso:** 1 por rodada. O comando de bomba (ou de ação) arremessa uma bomba do tile do anel em que está (posição arredondada) para dentro, perpendicular ao lado. **Na quina não arremessa** (para dentro seria ao longo da borda).
  - A bomba voa por cima de tudo e pousa no primeiro tile, a partir de `ghost.throwTiles` (3) tiles da borda, que aceita bomba e não tem bomba; se nenhum até o lado oposto, o arremesso é recusado e não é gasto.
  - Voo de `ghost.flightMs` (500); ao pousar, nasce com pavio normal e `range` = `player.startRange`. O dono é o fantasma (conta para os bots como bomba perigosa).
- O fantasma não é atingido por nada, não pega itens e não conta como vivo para o fim da rodada.
- Fantasmas somem quando a rodada termina.

## Casos de borda

- Morrer nos últimos instantes da rodada → pode não dar tempo de virar fantasma; sem efeito.
- Dois fantasmas no mesmo tile do anel → permitido.
- Pouso escolhido ocupado no momento do pouso (bomba nova, morte súbita) → vai para o próximo tile válido na mesma linha, para dentro; sem nenhum, a bomba se perde (o arremesso foi gasto).
- Morte súbita transformando o anel interno em parede não afeta o anel da borda (já é parede).

## Eventos

| Evento | Quando | Dados |
| --- | --- | --- |
| `fantasma.surgiu` | jogador vira fantasma | `playerId, x, y` |
| `fantasma.arremessou` | bomba lançada | `playerId, bombId, from, to` |

O pouso emite `bomba.colocada` (com `playerId` do fantasma).

## Dados

`ghost.delayMs` (1500), `ghost.speedTilesPerSecond` (3), `ghost.throwTiles` (3), `ghost.flightMs` (500). Estado em `Player.ghost` (perímetro, direção segurada, arremesso gasto, voo em andamento); `Player.deathTick` marca a morte.

Render (placeholder): círculo pequeno e translúcido na cor do jogador sobre a borda; a bomba voa em arco do fantasma ao pouso. Botão de ação aceso para o fantasma local enquanto o arremesso não foi gasto.

## Bots

- Bots vivos tratam a bomba no ar como uma bomba no tile de pouso com pavio = voo restante + pavio normal (o mapa de perigo inclui os voos).
- Bot fantasma: anda pelo anel até a posição do anel mais próxima da linha ou coluna do inimigo vivo mais próximo e arremessa quando a cruz da bomba no pouso pega um inimigo (fácil, `aggression` < 0,5: arremessa assim que houver pouso válido).

## Testes

[`tests/core/ghost.test.ts`](../../tests/core/ghost.test.ts), [`e2e/smoke.spec.ts`](../../e2e/smoke.spec.ts):

- Perímetro ↔ tile do anel (sentido horário do canto superior esquerdo).
- Surge depois do atraso, no ponto do anel mais perto da morte; não antes.
- Movimento: a direção do lado move, a perpendicular não; dobra a quina sozinho segurando a mesma direção.
- Arremesso: pousa no 1º tile válido a partir de 3 da borda (pula bloco), vira bomba depois do voo; só 1 por rodada; recusa sem gastar se não há pouso; não arremessa da quina.
- O fantasma não é atingido e não conta como vivo.
- Bots: a bomba no ar é perigo no pouso; bot fantasma se alinha e arremessa no inimigo.
- E2E: o jogador morre, vira fantasma, o botão de ação acende e a bomba arremessada pousa.

## Pendências

- Variante clássica "acertar alguém revive o fantasma" — não está no GDD; avaliar no playtest.
- ~~O fantasma no lado de cima fica sob os placares do HUD~~: resolvido no passo 10 (arena desenhada abaixo da barra do HUD, `render.boardTop`).
