# Registro de decisões

Formato: data — decisão — motivo. Novas decisões no topo.

- 2026-10-17 — Ids de fase em snake_case (`arena_01`), como os demais ids de conteúdo; exemplo do GDD ajustado. Fases ficam em `src/data/maps/*.json`, o tamanho da grade vem da fase e a área sem blocos em volta do spawn é `map.spawnSafeRadius` (distância Manhattan, padrão 1). — Uma regra só de id; área segura mínima que ainda permite a primeira bomba (soltar ao lado do spawn e se esconder no outro vizinho).
- 2026-10-17 — TypeScript fixado na linha 6.x. — typescript-eslint ainda não suporta o TS 7; rever quando houver suporte.
- 2026-10-17 — Bun como gerenciador de pacotes e runner de scripts (substitui npm). — Pedido do autor; instalação mais rápida. Testes seguem no Vitest via `bun run test`.
- 2026-10-17 — Regras de pureza do `src/core` reforçadas no ESLint (proíbe Phaser, `window`/`document`, `Math.random`, `Date.now`). — Falha cedo em vez de depender de revisão.
- 2026-10-17 — Nome do jogo: **Estouro Arena**. — Brasileiro, lembra o gênero sem usar a marca Bomberman.
- 2026-10-17 — Elenco do folclore brasileiro + personagens originais por arquétipo; nenhuma pessoa real. — Domínio público e sem risco de direito de imagem.
- 2026-10-17 — Montarias da fauna brasileira (tatu-bola, sapo-saltador, capivara, besouro-aríete, coruja, tamanduá, arara). — Substituem os dinossauros do clássico com identidade própria.
- 2026-10-17 — Stack: Phaser 3 + TypeScript strict + Vite + Vitest. — Engine 2D web madura, que a IA conhece bem.
- 2026-10-17 — Simulação (`src/core`) separada da renderização, comunicação por comandos e eventos. — Testável, determinística, pronta para multiplayer e áudio plugável.
- 2026-10-17 — Conteúdo e balanceamento em JSON validado por Zod. — Mudanças sem tocar no código, ideal para edição com IA.
- 2026-10-17 — Assets por nome lógico + manifest por tema. — Arte trocável.
- 2026-10-17 — Áudio via interface `AudioService` com `SilentAudio` no MVP. — Sem som agora, extensível depois.
- 2026-10-17 — Arte: pixel art 32 × 32 (provisório, aguardando confirmação). DiceBear só para avatares; PixelLab para sprites.
- 2026-10-17 — MVP = modo Batalha contra bots, com placeholders.
