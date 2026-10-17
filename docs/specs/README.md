# Specs por feature

Uma mini-spec por feature, escrita **antes** dos testes e commitada junto com a feature (ver ciclo em [`CLAUDE.md`](../../CLAUDE.md)). O GDD diz *o quê*; a spec diz *exatamente como*, com casos de borda e eventos.

Formato: status · regras · casos de borda · eventos · dados/config · testes · pendências.

| Spec | Status |
| --- | --- |
| [Dados e schemas](dados-e-schemas.md) | Feita |
| [Grade e mapa](grade-e-mapa.md) | Feita |
| [Movimento e assistência de curva](movimento.md) | Feita |
| [Controles de toque](controles-touch.md) | Feita |
| [Bomba e explosão](bomba-e-explosao.md) | Feita |
| [Painel de debug](painel-debug.md) | Feita |

## Fase 1 — MVP: Batalha (ordem de implementação)

Cada passo deixa o jogo jogável e testável; a ordem põe cedo o que destrava o playtest (rodadas e bots) e deixa por último o que embrulha tudo (menus).

| # | Spec | Depende de | Status |
| --- | --- | --- | --- |
| 1 | [Partida e rodadas](partida-e-rodadas.md) | — | Planejada |
| 2 | [Bots](bots.md) | 1 | Planejada |
| 3 | [Itens e power-ups](itens-e-power-ups.md) | — | Planejada |
| 4 | [Chute, remota e botão de ação](chute-e-remota.md) | 3 | Planejada |
| 5 | [Terrenos: água, mato, gelo, lama](terrenos.md) | — | Planejada |
| 6 | [Mapas da Fase 1](mapas-fase-1.md) | 3, 5 | Planejada |
| 7 | [Montarias: capivara e sapo](montarias.md) | 3, 4, 5 | Planejada |
| 8 | [Morte súbita](morte-subita.md) | 1 | Planejada |
| 9 | [Fantasma vingador](fantasma-vingador.md) | 1 | Planejada |
| 10 | [Menus e HUD](menus-e-hud.md) | todas | Planejada |

Specs planejadas podem mudar: revise a spec antes de começar cada passo e marque como feita no commit da feature.
