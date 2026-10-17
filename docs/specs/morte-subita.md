# Morte súbita

**Status:** planejada (Fase 1, passo 8). GDD §2 ("nos 30 s finais, blocos caem das bordas para o centro"). Depende de [partida e rodadas](partida-e-rodadas.md).

## Regras

- Começa quando o relógio da rodada chega a `suddenDeath.durationMs` (30000) restantes (`morte_subita.iniciou`).
- **Ordem de queda:** espiral no sentido horário, do anel jogável mais externo para o centro, começando no canto superior esquerdo de dentro das paredes. Tiles que já são parede são pulados.
- **Ritmo:** um tile por vez, a cada `durationMs / número de tiles da espiral` (arredondado para ticks, mínimo 1). Assim a espiral termina quando o relógio zera, em qualquer tamanho de mapa.
- **Tile atingido** vira `parede`, seja qual for o terreno (`morte_subita.bloco_caiu`):
  - jogador no tile morre (escudo da montaria **não** salva);
  - bomba no tile some sem explodir;
  - item no tile some;
  - chama no tile é apagada.
- A ordem da espiral é calculada uma vez por rodada a partir da grade (determinística).

## Casos de borda

- Rodada termina antes da espiral acabar → a queda para.
- Jogador no ar (pulo do sapo) sobre o tile → morre ao pousar se o pouso virou parede; o pulo é cancelado se o pouso cair antes.
- Bloco caindo sobre bloco quebrável com item → vira parede, o item some sem `item.revelado`.

## Eventos

| Evento | Quando | Dados |
| --- | --- | --- |
| `morte_subita.iniciou` | relógio chega ao limite | `round` |
| `morte_subita.bloco_caiu` | tile vira parede | `x, y` |

A morte usa `jogador.morreu` (ganha campo `cause: 'fogo' \| 'esmagado'` para o render e o áudio).

## Dados

`suddenDeath.durationMs` (30000). Texto `round.sudden_death` ("Morte súbita!").

## Bots

- O mapa de perigo marca os próximos `ceil(reactionMs / intervalo) + 2` tiles da espiral como perigo iminente.
- Na morte súbita os bots preferem tiles mais próximos do centro.

## Testes

- Ordem da espiral num mapa 5 × 5 conhecido.
- Intervalo cobre exatamente a duração.
- Jogador montado esmagado morre; bomba some sem `bomba.explodiu`.

## Pendências

- Aviso visual do próximo tile (sombra piscando antes de cair) — no render, sem mudar o core.
