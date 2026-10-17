# Bots

**Status:** feita (Fase 1, passo 2). GDD §3 (bots por regras, 3 níveis). Cada spec seguinte acrescenta uma seção "Bots" com o que muda para eles.

## Regras

- **Onde:** `src/core/bots/`, lógica pura. Um bot lê o `World` e devolve `Command[]` para o próprio id — o mesmo caminho do jogador humano (Entrada → `Command` → simulação). O bot nunca altera o mundo.
- **Determinismo:** cada bot tem um RNG próprio com seed derivada da seed da partida e do id (não consome o RNG do mundo, para não mudar a geração das grades).
- **Ritmo:** o bot **decide** a cada `reactionMs` do nível (não todo tick). Entre decisões ele só **executa** o plano: a cada tick segue a rota escolhida tile a tile (vira no tile certo e para no destino), sem reavaliar o perigo. Se a rota ficar bloqueada (bomba nova no caminho), decide de novo no tick seguinte.
- **Comandos:** só emite `move` quando a direção muda (como o `PlayerInput`) e `bomb` quando decide soltar. Só age com a rodada em `playing` ou `ending` e com o próprio jogador vivo; troca de rodada (mundo novo) zera o plano.
- **Mapa de perigo** (recalculado a cada decisão, [`dangerMap.ts`](../../src/core/bots/dangerMap.ts)): para cada tile, o intervalo `[início, fim)`, em ticks a partir de agora, em que ele terá chama.
  - Chama ativa = `[0, chama restante)`.
  - Cada bomba marca a cruz dela com `[pavio, pavio + explosionTicks)`, usando o mesmo `explosionTiles` da [explosão](bomba-e-explosao.md) (paradas em parede, bloco e bomba).
  - Cadeia: uma bomba na cruz de outra herda o menor tempo das duas (relaxação até estabilizar).
  - Intervalos que se sobrepõem num tile viram um só (menor início, maior fim) — conservador.
  - Aceita uma bomba hipotética (a que o bot pensa em soltar), sem mexer no mundo: `explosionTiles` recebe a lista de bombas a considerar.
- **Rotas** ([`paths.ts`](../../src/core/bots/paths.ts)): Dijkstra pela grade a partir da **posição contínua** do bot: o tempo de um tile é o tick em que o centro do bot cruza a borda dele (é quando o tile arredondado muda — e é o tile arredondado que a chama mata). O primeiro passo conta a distância real até a borda (mais o deslize lateral, se estiver fora do eixo); contar a partir do centro fazia o bot entrar numa chama que ainda não tinha apagado. Passo = `ceil(tickRate ÷ (velocidade × speedMultiplier do tile))` ticks (15 em chão normal). Entra em tile andável e sem bomba (o tile de partida pode ter bomba). Um tile só é usado se o tempo em que o bot fica nele não cruza o intervalo de perigo alargado por `escapeMarginMs` dos dois lados. **Seguro** = tile sem perigo nenhum.
- **Prioridades, nesta ordem:**
  1. **Fugir:** se o tile do bot terá chama antes de ele poder sair, vai até o tile seguro alcançável mais próximo (pelas rotas acima). Se a rota atual ainda leva a um tile seguro, **mantém o destino** em vez de escolher de novo — sem isso o bot "tremia" entre dois destinos equivalentes conforme a posição arredondada mudava e era pego pela própria bomba.
  2. **Atacar:** se um inimigo está na linha da futura cruz (alcance do bot) e existe rota de fuga considerando a bomba nova, solta bomba.
  3. **Item:** anda até o item visível mais próximo se ele estiver a ≤ `itemSearchTiles`. *Entra no passo 3 ([itens](itens-e-power-ups.md)); até lá não há itens.*
  4. **Abrir caminho:** no tile vizinho de um bloco, solta bomba (se houver fuga); senão anda até o tile seguro alcançável mais próximo que seja vizinho de bloco.
  5. **Caçar:** anda até o tile seguro alcançável mais perto (Manhattan) do inimigo vivo mais próximo; já estando nele, fica parado.
- **Ao soltar bomba** o bot já sai com a rota de fuga calculada na checagem (não espera a próxima decisão para fugir).
- **Checagem de fuga:** antes de soltar bomba, refaz o mapa de perigo com a bomba nova e exige um tile seguro alcançável antes da explosão, com folga `escapeMarginMs`.
- **Rotas** nunca passam por tile com perigo previsto para quando o bot chegaria nele.
- **Níveis** (`src/data/bots.json`):

| Nível (`id`) | `reactionMs` | `mistakeChance` | `aggression` | `itemSearchTiles` |
| --- | --- | --- | --- | --- |
| `facil` | 450 | 0,15 | 0,3 | 4 |
| `medio` | 250 | 0,05 | 0,6 | 8 |
| `dificil` | 100 | 0 | 0,9 | 15 |

- `mistakeChance`: chance, por bomba, de pular a checagem de fuga (o bot fácil às vezes se explode). `aggression`: chance, a cada decisão, de tentar Caçar antes de Abrir caminho/Item.
- **Nível na partida:** todos os bots com o mesmo nível; até o menu, `?nivel=facil|medio|dificil` (padrão `medio`).

## Casos de borda

- Sem nenhum tile seguro alcançável → anda para o tile alcançável de perigo mais tardio.
- Dois tiles igualmente bons → desempate fixo (o de menor índice na grade; vizinhos na ordem cima, direita, baixo, esquerda) para manter o determinismo.
- O bot para a até um passo de movimento do centro do tile de destino (não existe comando "pare no centro"); o tile arredondado é o certo.
- Bot preso entre blocos sem inimigo à vista → abre caminho.
- Bot morto não emite comandos (vira [fantasma](fantasma-vingador.md) depois, com regra própria).
- Desempenho: Dijkstra com seleção linear (grade pequena) e arrays tipados reaproveitados por bot; o mapa de perigo aloca só as listas de cruz das bombas, uma vez por decisão (não por tick).
- `?ia=0` deixa os adversários parados (testes e depuração; o e2e do portão da Fase 0 usa).

## Eventos

Nenhum próprio: os bots só geram comandos.

## Dados

`src/data/bots.json` validado por Zod (`BotsSchema`): `escapeMarginMs` (150) e `levels` com os 3 níveis acima. Convertido para ticks em `botLevelsFromConfig`.

## Testes

- Mapa de perigo: cruz simples, parede corta, cadeia herda o menor tempo.
- Bot em perigo foge para o tile seguro esperado.
- Bot não solta bomba sem fuga (com `mistakeChance` 0).
- Bot solta bomba quando o inimigo está na linha e há fuga.
- Mesma seed → mesmos comandos (replay).
- Sobrevivência: 1 bot `dificil` sozinho em `arena_01` (dados reais) por 60 s, em 20 seeds: sobrevive em ≥ 90 % e quebra blocos (sozinho, qualquer morte é pela própria bomba).
- Partida só de bots: 4 bots `medio`, 6 seeds, 3 rodadas cada, sem erro e com vencedores.
- E2E: com o jogador parado, os bots (`dificil`) quebram blocos sozinhos.

Arquivos: [`tests/core/bots.test.ts`](../../tests/core/bots.test.ts), [`tests/data/rules.test.ts`](../../tests/data/rules.test.ts), [`e2e/smoke.spec.ts`](../../e2e/smoke.spec.ts).

## Pendências

- Calibrar os números dos níveis jogando. Simulação (6 seeds, 4 bots iguais): muitas rodadas ainda terminam empatadas por tempo, sobretudo no `facil` — a [morte súbita](morte-subita.md) (passo 8) deve resolver; revisar a agressividade depois dela.
- Rotas não esperam no lugar (o Dijkstra não modela "esperar a chama apagar"); o bot só passa por um tile já em chama se chegar depois que ela apagar.
- Bots com itens especiais (chute, remota), terrenos, montarias e fantasma: seção "Bots" de cada spec.
