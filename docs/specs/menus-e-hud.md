# Menus e HUD

**Status:** feita (Fase 1, passo 10). GDD §2 (controles, HUD no topo), §3 (Batalha: escolha de mapa, 1–3 bots), CLAUDE.md (mobile).

## Regras

- **Tecnologia:** menus e HUD em HTML/CSS sobre o canvas (`src/ui/`), como o painel de debug: texto nítido, `env(safe-area-inset-*)` e acessibilidade sem custo para o Phaser. O HUD só atualiza o DOM quando um valor muda (escuta eventos e lê o estado), nunca por quadro.
- **Fluxo de telas:**
  1. **Título:** nome do jogo, botão **Jogar**.
  2. **Batalha:** mapa (3 cartões: `arena_01`, `pantanal_01`, `tundra_01`), bots (1, 2 ou 3), dificuldade (fácil, médio, difícil), botão **Começar**. A última escolha fica salva em `localStorage` (conveniência; falha silenciosa).
  3. **Partida:** HUD + controles de toque.
  4. **Resultado:** vencedor da partida ("Você venceu!" ou "Azul venceu!"), vitórias de cada um, **Revanche** (mesmas opções, seed nova) e **Menu**.
- **Atalhos de URL (dev e testes):** com qualquer um de `?seed`, `?map`, `?bots`, `?nivel`, `?ia`, `?roundMs`, `?winsToWin` ou `?debug`, o jogo pula os menus e começa direto com essas opções (o resto vem da última escolha salva). Sem parâmetros, abre no Título.
- **Cena:** uma cena vazia (`idle`) fica atrás dos menus; a partida (`arena`) começa com as opções escolhidas e avisa o fim (`onMatchOver`) para a tela de Resultado. Toque/Enter para recomeçar (passo 1) sai.
- **HUD (topo):** relógio `m:ss` no centro (pisca em vermelho na morte súbita); de cada lado, os jogadores com a cor e as vitórias (pontos); no canto superior direito, botão de **pausa** (≥ 44 px).
- **Arena abaixo do HUD:** a arena é desenhada a `render.boardTop` (56 px do jogo) do topo, em vez de centralizada, para a barra do HUD não cobrir a fileira de cima (nem o fantasma nela).
- **Painel do jogador** (embaixo, no centro, entre os polegares): bombas, alcance, nível de patins e etiquetas de chute, remota, perfurante, atravessar e montaria — só os que ele tem. Morto: "Fantasma: arremesso pronto/usado" (ou "Fora" antes de virar fantasma). Montado o painel mostra a montaria.
- **Avisos centrais:** contagem "3, 2, 1, Já!", "Morte súbita!", "Vermelho venceu a rodada!", "Empate!".
- **Pausa:** botão, `Esc`, `visibilitychange` (aba escondida) ou girar para retrato abrem o menu de pausa (**Continuar**, **Reiniciar partida**, **Sair para o menu**). Com o menu aberto, a cena não chama `step`; ao continuar, o passo fixo recomeça do zero (sem rajada de ticks).
- **Fantasma:** quando o jogador humano vira fantasma, os controles continuam (anel + arremesso) e o HUD mostra se o arremesso ainda está disponível.
- Os jogadores são identificados por cor (vermelho, azul, verde, amarelo) nos avisos ("Azul venceu a rodada!"); o jogador local é "Você" no Resultado.
- Teclado: `Enter` confirma, `Esc` pausa.

## Casos de borda

- Retrato: o aviso "gire o aparelho" fica por cima de tudo e pausa a partida.
- Sair no meio da partida → descarta a partida, sem confirmação extra na Fase 1.
- `localStorage` indisponível → usa os padrões (mapa `arena_01`, 3 bots, médio).

## Eventos

Nenhum novo no core. A UI escuta `rodada.*`, `partida.terminou`, `morte_subita.iniciou`, `item.pego`, `montaria.*`, `fantasma.*`.

## Dados

Textos em `strings.pt-BR.json` (`menu.*`, `map.*`, `level.*`, `hud.*`, `pause.*`, `result.*`); `render.boardTop` (56); cores dos jogadores em `game.json` (`render.playerColors`, já criado no passo 1). O HUD mínimo do passo 1 ([`MatchHud`](../../src/ui/MatchHud.ts)) é a base desta spec.

## Testes

- Vitest ([`tests/ui/menus.test.ts`](../../tests/ui/menus.test.ts), [`tests/ui/hudModel.test.ts`](../../tests/ui/hudModel.test.ts)): escolha salva (padrões, inválidos campo a campo, armazenamento que falha), atalhos de URL, painel do jogador (vivo, montado, fantasma, fora) e título do Resultado; relógio e contagem.
- Playwright: Título → Batalha → Começar mostra o HUD; escolha salva entre recargas; pausa abre e fecha (botão e `Esc`); com `?winsToWin=1&bots=1&ia=0`, o jogador se explode, o bot vence e aparecem Resultado, Revanche e Menu.

## Pendências

- Seleção de personagem e passivas — Fase 2 (ver [DECISIONS](../DECISIONS.md)).
- Avatares DiceBear nos nomes dos bots — Fase 2.
- Configurações (som, vibração) — Fase 3.
