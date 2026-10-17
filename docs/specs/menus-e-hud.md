# Menus e HUD

**Status:** planejada (Fase 1, passo 10). GDD §2 (controles, HUD no topo), §3 (Batalha: escolha de mapa, 1–3 bots), CLAUDE.md (mobile).

## Regras

- **Tecnologia:** menus e HUD em HTML/CSS sobre o canvas (`src/ui/`), como o painel de debug: texto nítido, `env(safe-area-inset-*)` e acessibilidade sem custo para o Phaser. O HUD só atualiza o DOM quando um valor muda (escuta eventos e lê o estado), nunca por quadro.
- **Fluxo de telas:**
  1. **Título:** nome do jogo, botão **Jogar**.
  2. **Batalha:** mapa (3 cartões: `arena_01`, `pantanal_01`, `tundra_01`), bots (1, 2 ou 3), dificuldade (fácil, médio, difícil), botão **Começar**. A última escolha fica salva em `localStorage` (conveniência; falha silenciosa).
  3. **Partida:** HUD + controles de toque.
  4. **Resultado:** vencedor da partida, vitórias de cada um, **Revanche** (mesmas opções, seed nova) e **Menu**.
- **HUD (topo):** relógio `m:ss` no centro (pisca em vermelho na morte súbita); de cada lado, os jogadores com a cor e as vitórias (pontos); no canto, botão de **pausa** (≥ 44 px).
- **Painel do jogador** (canto inferior, longe dos polegares): bombas, alcance, nível de velocidade e ícones de chute, remota, perfurante, atravessar e montaria — só os que ele tem.
- **Avisos centrais:** contagem "3, 2, 1, Já!", "Morte súbita!", "Vermelho venceu a rodada!", "Empate!".
- **Pausa:** botão ou `visibilitychange` abre o menu de pausa (**Continuar**, **Reiniciar partida**, **Sair para o menu**). Com o menu aberto, a cena não chama `step`.
- **Fantasma:** quando o jogador humano vira fantasma, os controles continuam (anel + arremesso) e o HUD mostra se o arremesso ainda está disponível.
- Os jogadores são identificados por cor (vermelho, azul, verde, amarelo) e nome "Você", "Bot 1"…, em `strings.pt-BR.json`.
- Teclado: `Enter` confirma, `Esc` pausa.

## Casos de borda

- Retrato: o aviso "gire o aparelho" fica por cima de tudo e pausa a partida.
- Sair no meio da partida → descarta a partida, sem confirmação extra na Fase 1.
- `localStorage` indisponível → usa os padrões (mapa `arena_01`, 3 bots, médio).

## Eventos

Nenhum novo no core. A UI escuta `rodada.*`, `partida.terminou`, `morte_subita.iniciou`, `item.pego`, `montaria.*`, `fantasma.*`.

## Dados

Textos em `strings.pt-BR.json` (`menu.*`, `hud.*`, `pause.*`, `result.*`, `player.*`); cores dos jogadores em `game.json` (`render.playerColors`, já criado no passo 1). O HUD mínimo do passo 1 ([`MatchHud`](../../src/ui/MatchHud.ts)) é a base desta spec.

## Testes

- Vitest (`tests/ui/`): formatação do relógio, contagem de vitórias e painel do jogador a partir de um estado/eventos.
- Playwright: Título → Batalha → Começar mostra o HUD; pausa abre e fecha; uma partida curta forçada (`?roundMs=` só em dev/teste) chega ao Resultado e à Revanche.

## Pendências

- Seleção de personagem e passivas — Fase 2 (ver [DECISIONS](../DECISIONS.md)).
- Avatares DiceBear nos nomes dos bots — Fase 2.
- Configurações (som, vibração) — Fase 3.
