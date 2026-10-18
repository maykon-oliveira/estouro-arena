# Chute, bomba remota e botão de ação

**Status:** feita (Fase 1, passo 4). Acrescenta `chute` e `remota` ao `src/data/items.json` (efeito `ability`) e à `items.defaultDistribution` (2 e 1). GDD §2 (power-ups, botão de ação especial). Depende de [itens e power-ups](itens-e-power-ups.md).

## Regras

### Botão de ação

- *(Desde a Fase 2, passo 2: o `action` virou os comandos `remote` e `mount`, cada um com o seu botão pequeno e as teclas `K`/`J` — ver [carga de energia](carga-de-energia.md).)*
- Novo comando `action { playerId }`. Toque: botão menor acima e à esquerda do botão de bomba (`controls.actionButtonPx`, ≥ 56 px), esmaecido quando não há ação disponível (hoje: nenhuma bomba remota do jogador no mapa). Teclado: `Shift` ou `K` (sem auto-repeat).
- Entrada: `PlayerInput` recebe fontes de bomba e de ação separadas (`PressTrigger`); vários toques no mesmo quadro viram **um** comando de cada.
- **Prioridade da ação**, nesta ordem: detonar bomba remota (se houver alguma do jogador no mapa) → habilidade da [montaria](montarias.md) → nada.

### Chute (`chute`)

- Depois do movimento (fase `kickBombs`), jogador vivo com chute, segurando uma direção, **parado no centro do próprio tile** (o movimento já para ali quando a bomba barra) e alinhado no eixo, com bomba parada no tile à frente, chuta a bomba nessa direção — se o tile depois da bomba estiver livre. O jogador fica no tile dele.
- A bomba chutada desliza a `bomb.kickSpeedTilesPerSecond` (8) e para no centro do último tile livre antes de: tile não andável (parede, bloco, água funda), outra bomba ou jogador vivo. Item no caminho não para a bomba (ela passa por cima).
- **Posição:** a bomba guarda o tile (`x, y`) e um avanço `slideProgress` na direção do deslize. Ao chegar a meio caminho (0,5) ela passa a pertencer ao tile seguinte (`x, y` mudam, avanço −0,5) — o mesmo arredondamento dos jogadores. Se o tile seguinte não estiver livre nesse momento, ela volta ao centro do tile atual e para (`bomba.parou`). O render desenha em `x + dx × slideProgress`.
- Ordem do tick nas bombas: chamas apagam → **bombas deslizam** → pavios → detonações.
- O pavio continua correndo durante o deslize. Se explodir deslizando, explode no tile a que pertence.
- Bomba deslizando que entra em chama ativa detona (regra já existente de bomba sobre chama).
- Bomba parada pode ser chutada de novo.

### Bomba remota (`remota`)

- Enquanto o jogador tem `remota`, as bombas novas dele nascem com `remote = true`: o pavio não corre (não explodem sozinhas).
- `action` detona a **mais antiga** (menor id) bomba remota do jogador, no mesmo tick. Cada toque detona uma.
- Bomba remota atingida por fogo explode normalmente (cadeia).
- Se o dono morre, as bombas remotas dele recebem pavio normal (`bomb.fuseMs`) a partir da morte.
- Remota + perfurante convivem.

## Casos de borda

- Chutar bomba encostada em obstáculo → não se move, sem evento.
- Duas bombas deslizando para o mesmo tile → a primeira processada (menor posição na lista de bombas) entra; a outra para antes.
- Jogador entra na frente de uma bomba deslizando → a bomba para antes dele.
- Bomba chutada e água: para antes (só entra em tile com `allowsBomb`; ver [terrenos](terrenos.md)).
- Sem `chute`, andar contra a bomba continua bloqueado como hoje.

## Eventos

| Evento | Quando | Dados |
| --- | --- | --- |
| `bomba.chutada` | bomba começa a deslizar | `bombId, playerId, dir` |
| `bomba.parou` | bomba chutada para | `bombId, x, y` |

A detonação remota usa o `bomba.explodiu` existente.

## Dados

`bomb.kickSpeedTilesPerSecond` (8), `controls.actionButtonPx` (64, mínimo 56). Itens `chute` e `remota` (`effect: ability`). Textos: `controls.action`. Som: `bomba.chutada` → `sfx_chute`.

## Bots

- Com remota: a cada decisão, se a remota mais antiga (a que o `action` detona) pega inimigo **ou bloco**, o bot refaz o mapa de perigo tratando as próprias remotas como explodindo agora (`detonateOwn`). Se o tile dele fica fora, aperta `action` e planeja a rota desta decisão com esse mapa — sem isso, ele detonava estando fora da cruz e entrava na chama logo depois (medido: 14/20 seeds sobreviviam; com o ajuste, 20/20).
- Mapa de perigo: bomba remota alheia = perigo desde já e sem fim (`[0, ∞)`), e o que ela atingir em cadeia também; a própria bomba remota não tem tempo (só entra no perigo se outra a atingir). A checagem de fuga antes de soltar usa o pavio normal (conservador).
- Com chute: as rotas não entram em tile com bomba, então o bot não chuta sem querer. Usar o chute para fugir fica para depois (pendência).

## Testes

[`tests/core/kickRemote.test.ts`](../../tests/core/kickRemote.test.ts), [`tests/input/PlayerInput.test.ts`](../../tests/input/PlayerInput.test.ts), [`e2e/smoke.spec.ts`](../../e2e/smoke.spec.ts) (remota com `K` e botão de ação):

- Chute desliza até a parede, até outra bomba e até um jogador; não chuta encostado em obstáculo; sem chute, bloqueia como antes.
- Pavio corre durante o deslize; explode no meio do caminho; entra em chama e detona.
- Remota não explode sozinha; `action` detona a mais antiga; morte do dono reativa o pavio; `action` sem bomba remota não faz nada.
- Entrada: `action` vem do botão/teclado, um por quadro.
- Bots: detonam a remota com inimigo na cruz e eles fora dela; perigo imediato das remotas alheias.
- Prioridade da ação: remota antes da montaria (testado em [montarias](montarias.md)).

## Pendências

- Bots usando o chute para fugir (níveis médio e difícil).
- Prioridade remota → montaria pode irritar quem monta o sapo com bombas remotas no chão; rever no playtest (alternativa: duplo toque na bomba detona).
