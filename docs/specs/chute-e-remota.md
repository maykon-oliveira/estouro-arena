# Chute, bomba remota e botão de ação

**Status:** planejada (Fase 1, passo 4). Este passo acrescenta `chute` e `remota` ao `src/data/items.json` (efeito `ability`, com handler novo onde precisar) e à `items.defaultDistribution` (2 e 1). GDD §2 (power-ups, botão de ação especial). Depende de [itens e power-ups](itens-e-power-ups.md).

## Regras

### Botão de ação

- Novo comando `action { playerId }`. Toque: botão menor à direita do botão de bomba (`controls.actionButtonPx`, ≥ 56 px), aparece esmaecido quando não há ação disponível. Teclado: `Shift` ou `K`.
- **Prioridade da ação**, nesta ordem: detonar bomba remota (se houver alguma do jogador no mapa) → habilidade da [montaria](montarias.md) → nada.

### Chute (`chute`)

- Jogador com chute que tenta **entrar** num tile com bomba (andando em direção a ela, já alinhado no eixo) chuta a bomba na direção do movimento. O jogador para no tile dele.
- A bomba chutada desliza a `bomb.kickSpeedTilesPerSecond` (8) tile a tile e para no centro do último tile livre antes de: parede, bloco, outra bomba, jogador ou terreno sem `allowsBomb` que também não seja andável (água funda). Item no caminho não para a bomba (ela passa por cima).
- O pavio continua correndo durante o deslize. Se explodir deslizando, explode no tile arredondado da posição.
- Bomba deslizando que entra em chama ativa detona (regra já existente de bomba sobre chama).
- Bomba parada pode ser chutada de novo.

### Bomba remota (`remota`)

- Enquanto o jogador tem `remota`, as bombas novas dele nascem com `remote = true`: não têm pavio (não explodem sozinhas).
- `action` detona a **mais antiga** bomba remota do jogador. Cada toque detona uma.
- Bomba remota atingida por fogo explode normalmente (cadeia).
- Se o dono morre, as bombas remotas dele recebem pavio normal (`bomb.fuseMs`) a partir da morte.
- Remota + perfurante convivem.

## Casos de borda

- Chutar bomba encostada em obstáculo → não se move, sem evento.
- Duas bombas chutadas uma contra a outra no mesmo tick → ambas param no tile em que estão.
- Jogador entra na frente de uma bomba deslizando → a bomba para antes dele.
- Bomba deslizando sobre água rasa: passa (não para), mas não pode parar ali; se o próximo tile for obstáculo, volta a parar no último tile com `allowsBomb`.
- Sem `chute`, andar contra a bomba continua bloqueado como hoje.

## Eventos

| Evento | Quando | Dados |
| --- | --- | --- |
| `bomba.chutada` | bomba começa a deslizar | `bombId, playerId, dir` |
| `bomba.parou` | bomba chutada para | `bombId, x, y` |

A detonação remota usa o `bomba.explodiu` existente.

## Dados

`bomb.kickSpeedTilesPerSecond` (8), `controls.actionButtonPx` (64). Textos: `controls.action`.

## Bots

- Com chute: ao fugir, chutar uma bomba para longe conta como saída se abrir caminho seguro (nível médio e difícil).
- Com remota: o bot detona quando um inimigo entra na cruz e ele próprio está fora dela; o mapa de perigo trata bomba remota alheia como "pode explodir a qualquer momento" (perigo imediato).

## Testes

- Chute desliza até a parede, até outra bomba e até um jogador.
- Pavio corre durante o deslize; explode no meio do caminho.
- Remota não explode sozinha; `action` detona a mais antiga; morte do dono reativa o pavio.
- Prioridade da ação: remota antes da montaria.

## Pendências

- Prioridade remota → montaria pode irritar quem monta o sapo com bombas remotas no chão; rever no playtest (alternativa: duplo toque na bomba detona).
