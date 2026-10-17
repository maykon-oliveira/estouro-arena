# Montarias: capivara e sapo-saltador

**Status:** feita (Fase 1, passo 7). GDD §2 (montarias), [PERSONAGENS §4](../PERSONAGENS.md#4-montarias-fauna-brasileira). Depende de [itens](itens-e-power-ups.md), [botão de ação](chute-e-remota.md) e [terrenos](terrenos.md).

Fase 1 tem 2 das 7 montarias, só no nível 1 (os níveis 2 e 3 ficam para depois).

## Regras

- **Catálogo** em `src/data/mounts.json`: `id`, `ability` (`jump` ou `null`), `terrainOverrides` (sobreposição de `walkable`/`speedMultiplier` por id de terreno enquanto montado) e parâmetros. O core consulta o terreno **efetivo** do jogador (terreno + sobreposição da montaria) no movimento e nas rotas dos bots — nada de `if (montaria === 'capivara')`.
- **Ovos** são itens (`ovo_capivara`, `ovo_sapo_saltador`) com efeito `mount` (`mount: <id>`), sorteados nos blocos como os outros itens (`items.defaultDistribution`: 1 de cada; `pantanal_01`: 2 capivaras e 1 sapo). A cor do ovo indica a montaria.
- **Montar:** jogador vivo **sem** montaria que pega um ovo monta na hora (`item.pego` + `montaria.montou`). Jogador já montado não pega ovo: o ovo fica no chão.
- **Escudo:** jogador montado atingido por chama perde a montaria em vez de morrer (`montaria.perdida`) e fica invulnerável a chamas por `mount.invulnerableMs` (1000), para a mesma explosão não matá-lo em seguida. Invulnerável, a chama não faz nada; acabou a invulnerabilidade ainda na chama, morre.
- **Capivara (`capivara`):** passiva, sem ação. `terrainOverrides`: `agua_rasa` → `speedMultiplier: 1`; `agua_funda` → `walkable: true, speedMultiplier: 1`.
- **Sapo-saltador (`sapo_saltador`):** ação **Pulo** (`action`, depois da remota na prioridade) — salta na direção `facing` e cai `jumpTiles` (2) adiante, a partir do tile atual, se o tile de pouso for andável (para quem pula), sem bomba e dentro da grade. O que está no meio não importa (parede, bloco, bomba, água funda). O pulo dura `jumpMs` (400): a posição vai em linha reta do centro de partida ao de pouso; no ar o jogador não anda, não colide, não é atingido por chama, não pega item, não chuta nem solta bomba; ao pousar volta tudo (a chama do tile de pouso vale no mesmo tick). Recarga `cooldownMs` (1000), contada a partir do início do pulo.
- Montaria não altera bombas, alcance nem velocidade base.
- **Botão de ação** aceso quando há remota no mapa **ou** a montaria tem habilidade pronta (sem recarga, sem estar no ar).
- **Render (placeholder):** elipse da cor da montaria sob o jogador (capivara marrom, sapo verde); no pulo o jogador cresce no meio do arco; invulnerável, pisca. Ovos: oval claro com pinta da cor da montaria.

## Casos de borda

- Capivara perdida dentro da água funda → o jogador é movido para o tile andável mais próximo (BFS; desempate cima, direita, baixo, esquerda), depois a invulnerabilidade de sempre.
- Pouso do sapo em tile com chama → a chama atinge o jogador ao pousar: como ainda está no sapo, perde a montaria (escudo) e fica invulnerável.
- Pulo com tile de pouso inválido → ação ignorada, sem gastar recarga.
- Dois jogadores pousando/andando no mesmo tile → permitido (jogadores não colidem entre si).
- Ovo atingido por chama → destruído como qualquer item.

## Eventos

| Evento | Quando | Dados |
| --- | --- | --- |
| `montaria.montou` | pegou ovo | `playerId, mountId` |
| `montaria.perdida` | escudo absorveu chama | `playerId, mountId` |
| `montaria.acao` | habilidade usada (pulo) | `playerId, mountId, from, to` |

## Dados

`src/data/mounts.json` (novo, `MountSchema`); itens `ovo_*` em `items.json`; `mount.invulnerableMs` (1000); parâmetros do sapo (`jumpMs` 400, `cooldownMs` 1000, `jumpTiles` 2) dentro da entrada dele. `blocos.itens` das fases ganha ovos (padrão: 1 de cada; `pantanal_01`: 2 capivaras).

## Bots

- Contam ovos como item desejado quando não estão montados.
- Montados na capivara, água entra na BFS com custo normal.
- Montados no sapo, o pulo entra na fuga: sem tile seguro alcançável a pé, sem remota no mapa (o `action` detonaria a remota) e com o pulo pronto, pulam se o pouso na direção em que estão virados for seguro. (Virar para pular em outra direção fica para depois.)

## Testes

[`tests/core/mounts.test.ts`](../../tests/core/mounts.test.ts), [`e2e/smoke.spec.ts`](../../e2e/smoke.spec.ts):

- Dados reais: `mounts.json` e os ovos em `items.json`.
- Montar com ovo; ovo ignorado se já montado.
- Escudo: chama tira a montaria, invulnerabilidade evita a segunda morte, depois dela morre normalmente.
- Capivara anda na água funda; perdendo-a na água, vai para o tile andável mais próximo.
- Sapo pula parede e bloco; recusa pouso inválido sem gastar recarga; no ar ignora chama; recarga.
- Prioridade do `action`: remota antes do pulo.
- Bots: buscam ovo só desmontados; capivara abre a água funda nas rotas.
- E2E: `+ ovo_sapo_saltador` acende o botão de ação, `K` pula 2 tiles e o botão apaga na recarga.
- Sobrevivência dos bots nas 3 fases segue ≥ 90 % com ovos e montarias ligados.

## Pendências

- Níveis 2 e 3 (subir de nível ao derrotar inimigos montado) e as outras 5 montarias — fases seguintes.
- Sprite do jogador montado: render com placeholder (cor da montaria sob o jogador).
