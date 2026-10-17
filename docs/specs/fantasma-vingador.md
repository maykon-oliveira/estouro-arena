# Fantasma vingador

**Status:** planejada (Fase 1, passo 9). GDD §5 ("quem morre vira fantasma na borda e pode arremessar 1 bomba por rodada"). Depende de [partida e rodadas](partida-e-rodadas.md).

## Regras

- `ghost.delayMs` (1500) depois de morrer, o jogador (humano ou bot) vira fantasma (`fantasma.surgiu`) num tile do **anel da borda** (linha/coluna mais externa da grade), o mais perto de onde morreu.
- **Movimento:** o fantasma anda só pelo anel, a `ghost.speedTilesPerSecond` (3), ignorando terreno, bombas e chamas. No joystick, as direções que seguem o anel movem; nas quinas, vira sozinho.
- **Arremesso:** 1 por rodada. O comando de bomba (ou de ação) arremessa uma bomba para dentro, perpendicular ao lado do anel em que está (nas quinas: para a direção do último movimento).
  - A bomba voa por cima de tudo e pousa no primeiro tile, a partir de `ghost.throwTiles` (3) tiles da borda, que aceita bomba e não tem bomba; se nenhum até o lado oposto, o arremesso é recusado e não é gasto.
  - Voo de `ghost.flightMs` (500); ao pousar, nasce com pavio normal e `range` = `player.startRange`. O dono é o fantasma (conta para os bots como bomba perigosa).
- O fantasma não é atingido por nada, não pega itens e não conta como vivo para o fim da rodada.
- Fantasmas somem quando a rodada termina.

## Casos de borda

- Morrer nos últimos instantes da rodada → pode não dar tempo de virar fantasma; sem efeito.
- Dois fantasmas no mesmo tile do anel → permitido.
- Pouso escolhido ocupado por bomba no momento do pouso → desliza para o próximo tile válido na mesma linha; sem nenhum, a bomba explode onde pousaria.
- Morte súbita transformando o anel interno em parede não afeta o anel da borda (já é parede).

## Eventos

| Evento | Quando | Dados |
| --- | --- | --- |
| `fantasma.surgiu` | jogador vira fantasma | `playerId, x, y` |
| `fantasma.arremessou` | bomba lançada | `playerId, bombId, from, to` |

O pouso emite `bomba.colocada` (com `playerId` do fantasma).

## Dados

`ghost.delayMs` (1500), `ghost.speedTilesPerSecond` (3), `ghost.throwTiles` (3), `ghost.flightMs` (500).

## Bots

- Bot fantasma anda pelo anel até alinhar com um inimigo vivo e arremessa quando o pouso cai na linha da cruz dele (nível fácil arremessa assim que puder).
- Bots vivos tratam o tile de pouso como perigo assim que veem a bomba no ar.

## Testes

- Fantasma surge no ponto do anel mais próximo da morte, após o atraso.
- Movimento só no anel, virando nas quinas.
- Arremesso pousa no primeiro tile válido a partir de `throwTiles`; recusado sem tile válido; só 1 por rodada.
- Fantasma não conta como vivo no fim da rodada.

## Pendências

- Variante clássica "acertar alguém revive o fantasma" — não está no GDD; avaliar no playtest.
