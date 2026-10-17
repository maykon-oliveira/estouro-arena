# Itens e power-ups

**Status:** feita (Fase 1, passo 3). GDD §2 (power-ups), §4 (`blocos.itens`).

Fase 1 tem 8 power-ups. Esta spec cobre o sorteio, a coleta e os 6 de atributo ou passivos; **chute** e **bomba remota** ficam em [chute e remota](chute-e-remota.md). Luva e caveira ficam para depois (ver [DECISIONS](../DECISIONS.md)).

## Regras

- **Catálogo** em `src/data/items.json`: `id`, `effect` (id do handler registrado em [`src/core/items.ts`](../../src/core/items.ts): `extra_bomb`, `extra_range`, `max_range`, `extra_speed`, `ability`) e parâmetros (`amount`, `ability`). Novo item = entrada no JSON + (se preciso) handler, sem `switch` espalhado. O catálogo tem os 8 itens da tabela (`chute` e `remota` entraram no passo 4, com a mecânica).

| Item (`id`) | Efeito | Limite |
| --- | --- | --- |
| Bomba +1 (`bomba`) | `maxBombs` +1 | `player.maxBombs` (8) |
| Fogo +1 (`fogo`) | `range` +1 | `player.maxRange` (8) |
| Fogo máximo (`fogo_max`) | `range` = `player.maxRange` | — |
| Patins (`patins`) | nível de velocidade +1 (+`player.speedStep` tiles/s) | `player.maxSpeedLevel` (4) |
| Chute (`chute`) | habilidade de chutar | ver [chute e remota](chute-e-remota.md) |
| Bomba remota (`remota`) | bombas só explodem por comando | ver [chute e remota](chute-e-remota.md) |
| Perfurante (`perfurante`) | o fogo das bombas do jogador atravessa blocos quebráveis | — |
| Atravessar blocos (`atravessa_bloco`) | anda por dentro de blocos quebráveis | — |

- **Sorteio na criação do mundo** (`hideItems`): `blocos.itens` da fase dá a quantidade de cada item (ids de item ou, no passo 7, de [ovo](montarias.md)). Depois de sortear os blocos, o core embaralha os índices dos blocos (Fisher–Yates com o RNG do mundo) e esconde um item em cada um dos primeiros, na ordem da lista. Itens a mais que blocos são descartados. Fase sem `blocos.itens` usa `items.defaultDistribution` do `game.json`. O sorteio vem **depois** dos blocos, então a mesma seed continua dando os mesmos blocos.
- **Revelação:** quando o bloco vira chão (`bloco.destruido`), o item escondido aparece no tile (`item.revelado`).
- **Coleta:** logo depois do movimento, cada jogador vivo (em ordem de id) cujo tile (posição arredondada) tem item o pega: aplica o efeito e remove o item (`item.pego`). Item no limite (ex.: 9ª bomba) é pego e some sem efeito. Ordem do tick: comandos → movimento → **coleta** → bombas/chamas → mortes.
- **Item destruído pelo fogo:** explosão que atinge um tile com item visível destrói o item (`item.destruido`). O fogo **não para** no item. (Um item revelado nasce num tile sem chama, porque a revelação acontece quando a chama do bloco apaga.)
- **Perfurante:** a bomba guarda `pierce` do dono ao ser solta. Na cruz dela, bloco quebrável (`destructible` + `blocksFire`) é incluído e o fogo continua; parede ainda para. Os itens desses blocos são revelados normalmente.
- **Atravessar blocos:** para o dono, terreno `bloco` conta como andável (inclusive na assistência de curva). Não permite soltar bomba dentro do bloco (`allowsBomb: false`).
- **Velocidade:** `player.speedTilesPerSecond + speedLevel × player.speedStep` (4 → até 6 tiles/s).
- **Debug:** com `?debug=1`, o painel tem um botão por item; clicar gera o comando `debugItem { playerId: 0, itemId }`, que põe o item no tile do jogador (coletado no mesmo tick). Passa pelo fluxo normal de comandos; o painel continua sem escrever no mundo.
- Os atributos ficam no `Player` (`maxBombs`, `range`, `speedLevel`, `abilities: Set<id>`); nada é guardado entre rodadas.

## Casos de borda

- Duas pessoas no mesmo tile com item → pega quem tem o menor id (ordem fixa).
- Bloco com item atingido por duas explosões no mesmo tick → revela uma vez.
- Jogador dentro de bloco (atravessa) quando o bloco é atingido → morre como em qualquer chama.
- Perfurante + cadeia: a bomba alheia atingida explode com as regras do dono dela.

## Eventos

| Evento | Quando | Dados |
| --- | --- | --- |
| `item.revelado` | bloco com item vira chão | `itemId, x, y` |
| `item.pego` | jogador coleta | `playerId, itemId, x, y` |
| `item.destruido` | chama atinge item visível | `itemId, x, y` |

## Dados

`src/data/items.json` (novo, `ItemsSchema`); `game.json`: `player.maxBombs` (8), `player.maxRange` (8), `player.speedStep` (0,5), `player.maxSpeedLevel` (4), `items.defaultDistribution` (`{ "bomba": 6, "fogo": 6, "patins": 3, "perfurante": 1, "atravessa_bloco": 1, "fogo_max": 1 }`; `chute` 2 e `remota` 1 entram no passo 4). Schemas validam que os ids de `blocos.itens` e da distribuição existem no catálogo. Som: `item.pego` → `sfx_item`.

## Bots

- Contam itens visíveis como objetivo (prioridade "Item"): o tile seguro alcançável com item mais próximo, a até `itemSearchTiles` (Manhattan) do bot. Ordem: atacar → (caçar, se a agressividade sortear) → item → abrir caminho → caçar.
- Com `perfurante`, a previsão de cruz das bombas do bot atravessa blocos.
- Com `atravessa_bloco`, blocos entram nas rotas como andáveis com custo dobrado (para não ficarem passeando dentro).
- Rotas e passos usam a velocidade do próprio bot (patins).

## Testes

[`tests/core/items.test.ts`](../../tests/core/items.test.ts), [`tests/core/bots.test.ts`](../../tests/core/bots.test.ts) (seção "bots e itens"), [`tests/data/maps.test.ts`](../../tests/data/maps.test.ts), [`e2e/smoke.spec.ts`](../../e2e/smoke.spec.ts):

- Sorteio determinístico, só em blocos, quantidade = `min(lista, blocos)`; não muda os blocos da seed; distribuição padrão.
- Revelação no `bloco.destruido`; coleta (menor id primeiro) e limites de cada atributo; item no limite some sem efeito.
- Explosão destrói item visível e não para nele.
- Patins acelera; perfurante atravessa 2 blocos e para na parede; atravessar blocos entra no bloco e não solta bomba dentro.
- Comando `debugItem` (item desconhecido ou jogador morto → ignorado).
- Bots: buscam item perto, ignoram além de `itemSearchTiles`, perigo com perfurante, rota por dentro de bloco; sobrevivência com itens ligados.
- Schema: item inexistente em `blocos.itens` é rejeitado.
- E2E: botões `+ fogo` e `+ patins` do painel de debug mudam alcance e velocidade.

## Pendências

- Luva e caveira (GDD §2) — fora da Fase 1.
- Spawn de itens pelo painel de debug (pendência da [spec do painel](painel-debug.md)) entra aqui.
