# Terrenos: água, mato, gelo e lama

**Status:** planejada (Fase 1, passo 5). GDD §4 (tipos de terreno).

Cinco terrenos novos, todos como entradas em `src/data/terrains.json`. O que não cabe nos campos atuais vira campo novo no schema (nunca `if (id === ...)` no core).

## Regras

| Terreno (`id`) | `walkable` | `speedMultiplier` | `blocksFire` | `destructible` | `allowsBomb` | Campo novo |
| --- | --- | --- | --- | --- | --- | --- |
| Água rasa (`agua_rasa`) | sim | 0,6 | não | não | não | — |
| Água funda (`agua_funda`) | não | 1 | não | não | não | — |
| Mato alto (`mato_alto`) | sim | 1 | não | sim | sim | `hides: true` |
| Gelo (`gelo`) | sim | 1 | não | não | sim | `slippery: true` |
| Lama (`lama`) | sim | 0,75 | não | não | sim | — |

- **Fogo e terreno destrutível:** a regra passa a ser "o fogo para em `blocksFire`; tile `destructible` atingido vira `chao` quando a chama apaga". Bloco (`blocksFire` + `destructible`) segue igual; mato (`destructible` sem `blocksFire`) queima e deixa o fogo seguir.
- **Água funda:** ninguém entra (exceto a [capivara](montarias.md), via sobreposição de terreno da montaria). O fogo passa por cima.
- **Mato alto (`hides`):** quem está dentro fica escondido — o render desenha só um contorno quando o jogador se move e nada quando parado. Bombas e itens no mato continuam visíveis (pilar "leitura instantânea"). O jogador humano sempre se vê.
- **Gelo (`slippery`):** jogador que entra num tile de gelo segue deslizando na direção de entrada, ignorando o joystick, até: o próximo tile não ser andável (para no centro do atual), ou chegar ao centro de um tile que não é gelo (volta o controle). Bombas soltas no gelo ficam paradas; bomba chutada já desliza até bater, então o gelo não muda o chute.
- **Velocidade:** a de quem está no tile = velocidade do jogador × `speedMultiplier` do tile (arredondado) onde está.
- **Geração:** blocos continuam nascendo só sobre `chao`.

## Casos de borda

- Mato pegando fogo com jogador dentro → o jogador morre (chama no tile), o mato vira chão depois.
- Deslizando no gelo contra uma bomba → para antes; com chute, chuta.
- Deslizando no gelo para dentro de chama → morre ao entrar.
- Gelo terminando em água funda → para no último gelo.
- Água rasa com `allowsBomb: false` → comando de bomba ignorado (já existe).

## Eventos

| Evento | Quando | Dados |
| --- | --- | --- |
| `terreno.queimou` | tile destrutível que não é bloco vira chão | `x, y, terrainId` |

(`bloco.destruido` continua só para blocos, por causa dos itens.)

## Dados

`terrains.json` com as 5 entradas; `TerrainSchema` ganha `hides` e `slippery` (opcionais, padrão `false`). Cores de placeholder em `ArenaScene` até o `manifest.json` de tema.

## Bots

- BFS com custo por tile = 1 / (velocidade × `speedMultiplier`); água funda fora da rota (exceto montado na capivara).
- Não soltam bomba onde não pode; evitam parar no gelo dentro de uma futura cruz (a rota no gelo é calculada até onde o deslize termina).
- **Mato:** um inimigo escondido só é visto pelo bot se estiver a ≤ 1 tile ou acabou de soltar bomba.

## Testes

- Velocidade em água rasa e lama.
- Água funda bloqueia, fogo passa.
- Mato queima, vira chão e não para o fogo; jogador no mato morre.
- Deslize no gelo: para no obstáculo, devolve o controle no fim do gelo, ignora o joystick no meio.
- Schema aceita os campos novos e rejeita terreno desconhecido.

## Pendências

- O GDD diz "bombas chutadas não param" no gelo; como o chute já desliza até bater, na Fase 1 o gelo não muda a bomba. Confirmar e ajustar o GDD.
- Fogo que se espalha pelo mato (GDD §5, "mapa vivo") — Fase 3.
