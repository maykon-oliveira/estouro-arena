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

## Arte provisória

| Spec | Status |
| --- | --- |
| [Texturas de terreno com DiceBear](tema-dicebear.md) | Feita |

## Fase 1 — MVP: Batalha (ordem de implementação)

Cada passo deixa o jogo jogável e testável; a ordem põe cedo o que destrava o playtest (rodadas e bots) e deixa por último o que embrulha tudo (menus).

| # | Spec | Depende de | Status |
| --- | --- | --- | --- |
| 1 | [Partida e rodadas](partida-e-rodadas.md) | — | Feita |
| 2 | [Bots](bots.md) | 1 | Feita |
| 3 | [Itens e power-ups](itens-e-power-ups.md) | — | Feita |
| 4 | [Chute, remota e botão de ação](chute-e-remota.md) | 3 | Feita |
| 5 | [Terrenos: água, mato, gelo, lama](terrenos.md) | — | Feita |
| 6 | [Mapas da Fase 1](mapas-fase-1.md) | 3, 5 | Feita |
| 7 | [Montarias: capivara e sapo](montarias.md) | 3, 4, 5 | Feita |
| 8 | [Morte súbita](morte-subita.md) | 1 | Feita |
| 9 | [Fantasma vingador](fantasma-vingador.md) | 1 | Feita |
| 10 | [Menus e HUD](menus-e-hud.md) | todas | Feita |

Fase concluída em 2026-10-18 (tag `fase-1`): amigos jogaram 10 partidas seguidas sem bug grave.

## Fase 2 — Arte e conteúdo (ordem proposta)

GDD §9: personagens com passiva, carga de energia e especiais, bombas elementais, campanha com 2 biomas de 6 fases e 1 chefe cada, sprites finais e tema visual, avatares DiceBear. **Portão:** 60 fps num Android intermediário. A ordem põe primeiro a jogabilidade, que não depende da arte paga, e deixa a arte e o desempenho para o fim, quando já se sabe o que precisa ser desenhado e otimizado. Cada spec é escrita (e as perguntas em aberto de [STATUS](../STATUS.md) respondidas) antes do seu passo.

| # | Spec | Escopo | Depende de | Status |
| --- | --- | --- | --- | --- |
| 1 | [Personagens e passivas](personagens-e-passivas.md) | Seleção de personagem na Batalha (6 do folclore, PERSONAGENS §1), passivas como dados, avatares DiceBear CC0 no menu e no HUD, bots com personagem | — | Feita |
| 2 | Carga de energia e especiais | Barra enchida por bloco destruído, especial de cada personagem no botão de ação, bots usando especiais | 1 | A escrever |
| 3 | Bombas elementais | Fogo (padrão), gelo, água e vento (GDD §5) como item e dados, interação com os terrenos | — | A escrever |
| 4 | Inimigos da campanha | Capangas com IA simples por regras (sapos encantados, morcegos, corujas-sombra), dados em JSON | — | A escrever |
| 5 | Estrutura da campanha | Modo Campanha no menu, mundos e fases, objetivo da fase, progresso salvo, cartas de bônus entre fases | 4 | A escrever |
| 6 | Mundo Pantanal | 6 fases, gimmick dos jacarés que surgem da água | 5 | A escrever |
| 7 | Mundo Tundra | 6 fases, neve, gimmick das bombas congeladas | 5 | A escrever |
| 8 | Chefes | 1 chefe por mundo, padrões de ataque legíveis no celular | 6, 7 | A escrever |
| 9 | Arte final e tema visual | Sprites de personagens, montarias, bombas, itens e inimigos pelo manifest do tema; fonte da arte a decidir | 1–8 | A escrever |
| 10 | Desempenho no celular | Pools, medição de fps em Android intermediário, orçamento por frame (portão) | 9 | A escrever |

Specs planejadas podem mudar: revise a spec antes de começar cada passo e marque como feita no commit da feature.
