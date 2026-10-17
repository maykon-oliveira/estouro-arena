# Terrenos: água, mato, gelo e lama

**Status:** feita (Fase 1, passo 5). A conferência visual dos terrenos no navegador fica para o passo 6, com as fases que os usam. GDD §4 (tipos de terreno).

Cinco terrenos novos, todos como entradas em `src/data/terrains.json`. O que não cabe nos campos atuais vira campo novo no schema (nunca `if (id === ...)` no core).

## Regras

| Terreno (`id`) | `walkable` | `speedMultiplier` | `blocksFire` | `destructible` | `allowsBomb` | Campo novo |
| --- | --- | --- | --- | --- | --- | --- |
| Água rasa (`agua_rasa`) | sim | 0,6 | não | não | não | — |
| Água funda (`agua_funda`) | não | 1 | não | não | não | — |
| Mato alto (`mato_alto`) | sim | 1 | não | sim | sim | `hides: true` |
| Gelo (`gelo`) | sim | 1 | não | não | sim | `slippery: true` |
| Lama (`lama`) | sim | 0,75 | não | não | sim | — |

- **Fogo e terreno destrutível:** a regra passa a ser "o fogo para em `blocksFire`; tile `destructible` atingido vira `chao` quando a chama apaga". Bloco (`blocksFire` + `destructible`) segue igual e emite `bloco.destruido` (e revela item); mato (`destructible` sem `blocksFire`) queima, deixa o fogo seguir e emite `terreno.queimou`.
- **Água funda:** ninguém entra (exceto a [capivara](montarias.md), via sobreposição de terreno da montaria). O fogo passa por cima.
- **Mato alto (`hides`):** quem está dentro fica escondido — o render desenha só um contorno quando o jogador se move e nada quando parado. Bombas e itens no mato continuam visíveis (pilar "leitura instantânea"). O jogador humano sempre se vê (meio transparente no mato). É só visual: o core não muda nada para quem está escondido.
- **Gelo (`slippery`):** jogador que se move estando (tile arredondado) no gelo passa a deslizar na direção do movimento (`Player.iceSlide`), ignorando o joystick, até: o próximo tile não ser enterável (para no centro do atual e o deslize acaba — dá para escolher outra direção), ou chegar ao centro do primeiro tile que não é gelo (para ali e volta o controle). Bombas soltas no gelo ficam paradas; a bomba chutada já desliza até bater, então **o gelo não muda o chute** (decisão do autor; GDD ajustado).
- **Água e bomba chutada:** a bomba chutada só entra em tile com `allowsBomb` — para antes da água rasa (afundaria) e da água funda.
- **Velocidade:** a de quem está no tile = velocidade do jogador × `speedMultiplier` do tile (arredondado) onde está.
- **Geração:** blocos continuam nascendo só sobre `chao`.

## Casos de borda

- Mato pegando fogo com jogador dentro → o jogador morre (chama no tile), o mato vira chão depois.
- Deslizando no gelo contra uma bomba → para antes (no centro); com chute, chuta.
- Deslizando no gelo para dentro de chama → morre ao entrar.
- Gelo terminando em água funda → para no último gelo.
- Água rasa com `allowsBomb: false` → comando de bomba ignorado (já existe).

## Eventos

| Evento | Quando | Dados |
| --- | --- | --- |
| `terreno.queimou` | tile destrutível sem `blocksFire` (mato) termina de queimar e vira chão | `x, y, terrainId` |

(`bloco.destruido` continua só para blocos, por causa dos itens.)

## Dados

`terrains.json` com as 5 entradas; `TerrainSchema` ganha `hides` e `slippery` (opcionais, padrão `false`). Cores de placeholder em `ArenaScene` até o `manifest.json` de tema. As fases que usam os terrenos vêm no passo 6 ([mapas](mapas-fase-1.md)); até lá, só os testes os exercitam.

## Bots

- Rotas com custo por tile = `ceil(tickRate ÷ (velocidade × speedMultiplier))`; água funda fora da rota (exceto montado na capivara, passo 7).
- Não soltam bomba onde não pode. **Gelo nas rotas:** saindo de um tile de gelo, a rota só continua na mesma direção em que entrou (se o tile à frente for enterável; senão para ali e pode virar). Tiles de gelo nunca são destino (o bot não consegue parar no meio do gelo).
- **Mato:** um inimigo escondido (em tile `hides`) só é visto pelo bot se estiver a ≤ 1 tile (Manhattan) — para atacar e caçar.

## Testes

[`tests/core/terrains.test.ts`](../../tests/core/terrains.test.ts):

- Os 5 terrenos reais com as propriedades da tabela.
- Velocidade em água rasa e lama.
- Água funda bloqueia, fogo passa.
- Mato queima, vira chão e não para o fogo; jogador no mato morre.
- Deslize no gelo: para no obstáculo, devolve o controle no fim do gelo, ignora o joystick no meio, para antes de bomba, gelo terminando em água funda.
- Bomba chutada para antes da água rasa.
- Bots: rota no gelo só segue reto; não caçam inimigo escondido no mato a mais de 1 tile.
- Schema aceita os campos novos e rejeita terreno desconhecido.

## Pendências

- Fogo que se espalha pelo mato (GDD §5, "mapa vivo") — Fase 3.
- Bot "ouvir" a bomba solta por um inimigo escondido no mato.
