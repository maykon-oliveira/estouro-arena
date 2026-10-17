# Bots

**Status:** planejada (Fase 1, passo 2). GDD §3 (bots por regras, 3 níveis). Cada spec seguinte acrescenta uma seção "Bots" com o que muda para eles.

## Regras

- **Onde:** `src/core/bots/`, lógica pura. Um bot lê o `World` e devolve `Command[]` para o próprio id — o mesmo caminho do jogador humano (Entrada → `Command` → simulação). O bot nunca altera o mundo.
- **Determinismo:** cada bot tem um RNG próprio com seed derivada da seed da partida e do id (não consome o RNG do mundo, para não mudar a geração das grades).
- **Ritmo:** o bot decide a cada `reactionMs` do nível (não todo tick); entre decisões, mantém o último comando de movimento.
- **Mapa de perigo** (recalculado a cada decisão): para cada tile, o tick previsto em que ele terá chama.
  - Chama ativa = perigo agora.
  - Cada bomba marca a cruz dela (mesmas regras de parede, bloco e bomba da [explosão](bomba-e-explosao.md)) com o pavio restante.
  - Cadeia: uma bomba na cruz de outra herda o menor tempo das duas.
- **Prioridades, nesta ordem:**
  1. **Fugir:** se o tile do bot terá chama antes de ele poder sair, busca (BFS, custo em ticks pela velocidade e terreno) o tile seguro mais próximo alcançável antes do perigo, e anda até ele.
  2. **Atacar:** se um inimigo está na linha da futura cruz (alcance do bot) e existe rota de fuga considerando a bomba nova, solta bomba.
  3. **Item:** anda até o item visível mais próximo (BFS) se ele estiver a ≤ `itemSearchTiles`.
  4. **Abrir caminho:** anda até um tile vizinho de bloco e solta bomba, se houver fuga.
  5. **Caçar:** anda em direção ao inimigo mais próximo; sem rota, fica em tile seguro.
- **Checagem de fuga:** antes de soltar bomba, refaz o mapa de perigo com a bomba nova e exige um tile seguro alcançável antes da explosão, com folga `escapeMarginMs`.
- **Rotas** nunca passam por tile com perigo previsto para quando o bot chegaria nele.
- **Níveis** (`src/data/bots.json`):

| Nível | `reactionMs` | `mistakeChance` | `aggression` | `itemSearchTiles` |
| --- | --- | --- | --- | --- |
| `facil` | 450 | 0,15 | 0,3 | 4 |
| `medio` | 250 | 0,05 | 0,6 | 8 |
| `dificil` | 100 | 0 | 0,9 | 15 |

- `mistakeChance`: chance, por bomba, de pular a checagem de fuga (o bot fácil às vezes se explode). `aggression`: chance de preferir Atacar/Caçar a Item/Abrir caminho quando ambos são possíveis.

## Casos de borda

- Sem nenhum tile seguro alcançável → anda para o de perigo mais tardio.
- Dois tiles igualmente bons → desempate fixo (cima, direita, baixo, esquerda) para manter o determinismo.
- Bot preso entre blocos sem inimigo à vista → abre caminho.
- Bot morto não emite comandos (vira [fantasma](fantasma-vingador.md) depois, com regra própria).
- Desempenho: BFS em grade 15 × 13 com arrays pré-alocados; nenhuma alocação por tick.

## Eventos

Nenhum próprio: os bots só geram comandos.

## Dados

`src/data/bots.json` validado por Zod (`BotLevelSchema`), níveis acima mais `escapeMarginMs` (150).

## Testes

- Mapa de perigo: cruz simples, parede corta, cadeia herda o menor tempo.
- Bot em perigo foge para o tile seguro esperado.
- Bot não solta bomba sem fuga (com `mistakeChance` 0).
- Bot solta bomba quando o inimigo está na linha e há fuga.
- Mesma seed → mesmos comandos (replay).
- Simulação de 60 s com 4 bots `dificil` em `arena_01`: nenhum bot morre pela própria bomba em ≥ 90 % das seeds de teste.

## Pendências

- Calibrar os números dos níveis jogando.
- Bots com itens especiais (chute, remota), terrenos, montarias e fantasma: seção "Bots" de cada spec.
