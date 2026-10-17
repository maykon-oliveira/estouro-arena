# Morte súbita

**Status:** feita (Fase 1, passo 8). GDD §2 ("nos 30 s finais, blocos caem das bordas para o centro"). Depende de [partida e rodadas](partida-e-rodadas.md).

## Regras

- Começa quando o relógio da rodada chega a `suddenDeath.durationMs` (30000) restantes (`morte_subita.iniciou`).
- **Ordem de queda:** espiral no sentido horário, do anel jogável mais externo para o centro, começando no canto superior esquerdo de dentro das paredes. Tiles que já são parede são pulados.
- **Ritmo:** o tile `k` (de `n`, a partir de 0) cai no tick `início + round((k + 1) × duração ÷ n)` (duração em ticks). Assim a espiral termina exatamente quando o relógio zera, em qualquer tamanho de mapa (vários tiles no mesmo tick se `n` > duração).
- **Estado no mundo:** ao começar, a partida grava em `world.collapse` a ordem, o próximo índice e o tick de queda de cada tile (`dropAt`, por índice de tile). O render e os bots só leem.
- **Tile atingido** vira `parede`, seja qual for o terreno (`morte_subita.bloco_caiu`):
  - jogador no tile morre (`jogador.morreu` com `cause: 'esmagado'`); escudo da montaria e invulnerabilidade **não** salvam;
  - bomba no tile some sem explodir;
  - item no tile some;
  - chama no tile é apagada.
- A ordem da espiral é calculada uma vez por rodada a partir da grade (determinística).

## Casos de borda

- Rodada termina antes da espiral acabar → a queda para.
- Jogador no ar (pulo do sapo): o tile por onde passa não importa; se o **tile de pouso** cai durante o pulo, ele morre na hora (esmagado).
- Bloco caindo sobre bloco quebrável com item → vira parede, o item some sem `item.revelado`.

## Eventos

| Evento | Quando | Dados |
| --- | --- | --- |
| `morte_subita.iniciou` | relógio chega ao limite | `round` |
| `morte_subita.bloco_caiu` | tile vira parede | `x, y` |

A morte usa `jogador.morreu`, que ganha `cause: 'fogo' \| 'esmagado'` (render e áudio podem diferenciar).

## Dados

`suddenDeath.durationMs` (30000); `bots.json`: `collapseHorizonMs` (3000). Texto `round.sudden_death` ("Morte súbita!"). HUD: aviso central por `hud.suddenDeathBannerMs` (1500) e relógio vermelho pulsando (`data-sudden`). Para testes, `?roundMs=N` encurta a rodada.

## Bots

- O mapa de perigo marca os tiles que vão cair dentro de `collapseHorizonMs` com perigo desde a queda e **sem fim** (`[queda, ∞)`): as rotas não terminam nem passam por eles depois que caem.
- Recuo: na morte súbita, se o tile do bot cai em menos de 2 × o horizonte, ele vai para o tile seguro alcançável que cai mais tarde (rumo ao centro).

## Testes

[`tests/core/suddenDeath.test.ts`](../../tests/core/suddenDeath.test.ts), [`e2e/smoke.spec.ts`](../../e2e/smoke.spec.ts):

- Ordem da espiral num mapa 5 × 5 conhecido; pula paredes; grade não quadrada.
- Intervalo cobre exatamente a duração.
- Jogador montado esmagado morre (`cause: 'esmagado'`); bomba some sem `bomba.explodiu`; item, item escondido e chama somem.
- Pulo: tile de pouso caindo mata quem está no ar.
- Na partida: começa no limite do relógio, termina a rodada; rodada nova começa sem queda.
- Bots: tiles dentro do horizonte viram perigo `[queda, ∞)`.
- E2E: com `?roundMs=32000`, aparece "Morte súbita!" e `data-sudden=1`.
- Medido (simulação, 4 bots iguais, 3 fases × 4 seeds): partidas terminadas 10/12 (fácil), 12/12 (médio), 11/12 (difícil) — antes, a maioria das rodadas acabava empatada por tempo.

## Pendências

- ~~Aviso visual~~: o render pinta de vermelho translúcido os próximos 3 tiles a cair (lê `world.collapse`).
