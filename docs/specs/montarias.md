# Montarias: capivara e sapo-saltador

**Status:** planejada (Fase 1, passo 7). GDD §2 (montarias), [PERSONAGENS §4](../PERSONAGENS.md#4-montarias-fauna-brasileira). Depende de [itens](itens-e-power-ups.md), [botão de ação](chute-e-remota.md) e [terrenos](terrenos.md).

Fase 1 tem 2 das 7 montarias, só no nível 1 (os níveis 2 e 3 ficam para depois).

## Regras

- **Catálogo** em `src/data/mounts.json`: `id`, `ability` (id do handler ou `null`), `terrainOverrides` (sobreposição de campos de terreno enquanto montado) e parâmetros.
- **Ovos** são itens (`ovo_capivara`, `ovo_sapo_saltador`) com efeito `mount`, sorteados nos blocos como os outros itens. A cor do ovo indica a montaria.
- **Montar:** jogador vivo **sem** montaria que pega um ovo monta na hora (`montaria.montou`). Jogador já montado não pega ovo: o ovo fica no chão.
- **Escudo:** jogador montado atingido por chama perde a montaria em vez de morrer (`montaria.perdida`) e fica invulnerável a chamas por `mount.invulnerableMs` (1000), para a mesma explosão não matá-lo em seguida.
- **Capivara (`capivara`):** passiva, sem ação. `terrainOverrides`: `agua_rasa` → `speedMultiplier: 1`; `agua_funda` → `walkable: true, speedMultiplier: 1`.
- **Sapo-saltador (`sapo_saltador`):** ação **Pulo** — salta por cima do tile à frente (direção `facing`) e cai 2 tiles adiante, se o tile de pouso for andável, sem bomba e dentro da grade. O que está no meio não importa (parede, bloco, bomba, água funda). O pulo dura `sapo.jumpMs` (400): no ar o jogador não colide, não é atingido por chama nem pega item; ao pousar volta tudo. Recarga `sapo.cooldownMs` (1000).
- Montaria não altera bombas, alcance nem velocidade base.

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
- Montados no sapo, o pulo entra na fuga: se não há rota a pé, testam o pulo para um tile seguro.

## Testes

- Montar com ovo; ovo ignorado se já montado.
- Escudo: chama tira a montaria, invulnerabilidade evita a segunda morte, depois dela morre normalmente.
- Capivara anda na água funda; perdendo-a na água, vai para o tile andável mais próximo.
- Sapo pula parede e bloco; recusa pouso inválido; no ar ignora chama; recarga.

## Pendências

- Níveis 2 e 3 (subir de nível ao derrotar inimigos montado) e as outras 5 montarias — fases seguintes.
- Sprite do jogador montado: render com placeholder (cor da montaria sob o jogador).
