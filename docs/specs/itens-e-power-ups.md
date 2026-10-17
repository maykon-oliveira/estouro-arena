# Itens e power-ups

**Status:** planejada (Fase 1, passo 3). GDD §2 (power-ups), §4 (`blocos.itens`).

Fase 1 tem 8 power-ups. Esta spec cobre o sorteio, a coleta e os 6 de atributo ou passivos; **chute** e **bomba remota** ficam em [chute e remota](chute-e-remota.md). Luva e caveira ficam para depois (ver [DECISIONS](../DECISIONS.md)).

## Regras

- **Catálogo** em `src/data/items.json`: `id`, `effect` (id do handler registrado no core) e parâmetros. Novo item = entrada no JSON + handler, sem `switch` espalhado.

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

- **Sorteio na geração da grade:** `blocos.itens` da fase dá a quantidade de cada item (ids de item ou de [ovo](montarias.md)). Depois de sortear os blocos, o core embaralha os blocos (RNG do mundo) e esconde um item em cada um dos primeiros, até acabar a lista. Itens a mais que blocos são descartados. Fase sem `blocos.itens` usa `items.defaultDistribution` do `game.json`.
- **Revelação:** quando o bloco vira chão (`bloco.destruido`), o item escondido aparece no tile (`item.revelado`).
- **Coleta:** jogador vivo cujo tile (posição arredondada) tem item o pega no mesmo tick: aplica o efeito e remove o item (`item.pego`). Item no limite (ex.: 9ª bomba) é pego e some sem efeito.
- **Item destruído pelo fogo:** chama que atinge um tile com item visível destrói o item (`item.destruido`). O fogo **não para** no item.
- **Perfurante:** na cruz das bombas do dono, bloco quebrável (`destructible` + `blocksFire`) é incluído e o fogo continua; parede ainda para. Os itens desses blocos são revelados normalmente.
- **Atravessar blocos:** para o dono, terreno `bloco` conta como andável. Não permite soltar bomba dentro do bloco.
- Os atributos ficam no `Player` (`maxBombs`, `range`, `speedLevel`, `abilities: Set<id>`); nada é guardado entre rodadas.

## Casos de borda

- Duas pessoas no mesmo tile com item → pega quem tem o menor id (ordem fixa).
- Bloco com item atingido por duas explosões no mesmo tick → revela uma vez.
- Bomba solta sobre um item visível → o item continua embaixo; quem sair dali não pega de novo até voltar.
- Jogador dentro de bloco (atravessa) quando o bloco é atingido → morre como em qualquer chama.
- Perfurante + cadeia: a bomba alheia atingida explode com as regras do dono dela.

## Eventos

| Evento | Quando | Dados |
| --- | --- | --- |
| `item.revelado` | bloco com item vira chão | `itemId, x, y` |
| `item.pego` | jogador coleta | `playerId, itemId, x, y` |
| `item.destruido` | chama atinge item visível | `itemId, x, y` |

## Dados

`src/data/items.json` (novo, `ItemSchema`); `game.json`: `player.maxBombs`, `player.maxRange`, `player.speedStep` (0,5), `player.maxSpeedLevel`, `items.defaultDistribution` (`{ "bomba": 6, "fogo": 6, "patins": 3, "chute": 2, "remota": 1, "perfurante": 1, "atravessa_bloco": 1, "fogo_max": 1 }`). Schema da fase valida que os ids de `blocos.itens` existem.

## Bots

- Contam itens visíveis como objetivo (prioridade "Item").
- Com `perfurante`, a previsão de cruz das bombas do bot atravessa blocos.
- Com `atravessa_bloco`, blocos entram na BFS como andáveis (custo maior, para não ficarem presos dentro).

## Testes

- Sorteio determinístico; quantidade de itens = `min(lista, blocos)`.
- Revelação no `bloco.destruido`; coleta e limites de cada atributo.
- Fogo destrói item visível e não para nele.
- Perfurante atravessa 2 blocos e para na parede.
- Atravessar blocos: entra no bloco; não solta bomba dentro.

## Pendências

- Luva e caveira (GDD §2) — fora da Fase 1.
- Spawn de itens pelo painel de debug (pendência da [spec do painel](painel-debug.md)) entra aqui.
