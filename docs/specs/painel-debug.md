# Painel de debug

**Status:** feita. CLAUDE.md (Convenções: "painel ativado por `?debug=1`…"), GDD §9 (Fase 0).

## Regras

- Ativado só com `?debug=1` na URL, também no build de produção (para depurar no celular). Sem o parâmetro, nada é criado e não há custo.
- **Somente leitura:** o painel lê o estado e nunca escreve no mundo. Ações que mudam a partida só recarregam a página.
- **Sobreposições no canvas** (camada Phaser acima de bombas e chamas), cada uma com liga/desliga:
  - **Grade:** linhas finas entre tiles.
  - **Hitbox:** contorno do tile ocupado pelo jogador (posição arredondada, que é o tile usado para morte e para soltar bomba) e um ponto no centro real.
  - **Raio:** para cada bomba ativa, os tiles que a explosão atingiria *agora*. O cálculo é o mesmo do core (`explosionTiles`), então o desenho bate com a explosão real, inclusive paradas em bloco, parede e bomba.
- **Painel de texto** (DOM, canto superior esquerdo, respeitando `safe-area-inset`): fps, tick, seed, mapa, posição e tile do jogador, vivo/morto, bombas ativas/máximo, alcance e blocos restantes.
  - Atualiza no máximo 10×/s.
  - Os mesmos valores ficam em atributos `data-*` do painel, para os testes e2e lerem.
- **Ações:** "Reiniciar" (recarrega com a mesma seed) e "Nova seed" (recarrega com seed aleatória), mantendo `?debug=1`.
- Os rótulos do painel ficam no código e não vão para `strings.pt-BR.json`: é ferramenta de desenvolvimento, não texto do jogo.

## Core: `explosionTiles(world, bomb)`

- Função pura em `src/core/bombs.ts`: devolve `{ tiles, hitBombs }` sem alterar o mundo.
- `explode` passa a usá-la, garantindo uma regra só.

## Casos de borda

- Bomba encostada em bloco: o raio mostra o bloco e para.
- Duas bombas em linha: o raio da primeira para na segunda.
- Jogador morto: hitbox some e o painel mostra "morto".
- `?debug=0` ou ausente → desligado.

## Eventos

Nenhum novo.

## Smoke test (Playwright)

Roda contra o **build de produção** (`vite preview`), em viewport de celular na horizontal (812 × 375, touch):

1. Carrega sem erros no console; canvas e botão de bomba visíveis.
2. Em retrato, aparece o aviso de girar.
3. Com `?seed=0&debug=1`, o fluxo do portão da Fase 0: andar →, bomba, ←, ↓, esperar a explosão → blocos restantes diminuem e o jogador continua vivo (lido em `data-*` do painel).

## Pendências

- Spawn de itens pelo painel: quando existirem itens (Fase 1).
- Botão de invencibilidade/câmera lenta: exigiriam comandos de debug no core; avaliar quando houver necessidade.
