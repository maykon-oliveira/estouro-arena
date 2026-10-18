# Carga de energia, especiais e botões separados

**Status:** feita (Fase 2, passo 2), em dois commits: (a) barra, botões e teclas, Saci, Boto e Mula; (b) Boitatá, Iara e Curupira. GDD §5 ("carga de energia"), [PERSONAGENS §1](../PERSONAGENS.md#1-elenco-principal-folclore). Depende de [personagens e passivas](personagens-e-passivas.md), [chute e remota](chute-e-remota.md) e [montarias](montarias.md).

Cada personagem ganha uma barra de energia; cheia, libera o **especial** dele. O botão de ação único da Fase 1 vira **três botões pequenos** (remota, montaria, especial), cada um só aparece quando o jogador tem aquilo.

Entrega em dois commits: **(a)** barra, botões e teclas, Saci, Boto e Mula; **(b)** Boitatá, Iara e Curupira.

## Regras — energia

- `player.energy` vai de 0 a `energy.max` (100). Zera a cada rodada (o mundo é recriado); fantasma não tem energia.
- **Ganhos** (`game.json`, `energy`):
  - `perBlock` (10): bloco quebrável destruído pelo fogo de uma bomba do jogador (quando a chama apaga e o bloco vira chão). Mato queimado não conta.
  - `perKnockout` (40): rival morto pela chama de uma bomba do jogador. A própria bomba matando o dono não dá nada. Esmagado pela morte súbita não dá nada.
  - `perSecond` (1): a cada segundo vivo na rodada (`tickRate` ticks).
- **De quem é a chama:** a explosão grava o dono da bomba em cada tile que pega fogo (`world.flameOwner`, −1 = ninguém). Explosões sobrepostas: vale a última. Bombas em cadeia: cada uma credita o próprio dono. Bomba do fantasma: credita o fantasma (que não usa energia).
- Cheia, para em `max` (`energia.cheia` uma vez por enchimento).
- **Usar:** comando `special` com a barra cheia e o especial possível agora → gasta a barra inteira (`especial.usado`). Especial impossível (pouso inválido, sem rival…) → nada acontece e a barra fica cheia.
- Sem personagem (`character: null`) não há especial; a barra enche igual, sem uso.

## Regras — comandos e botões

- O comando `action` some. No lugar: `remote` (detona a remota mais antiga), `mount` (habilidade da montaria: pulo do sapo) e `special`.
- **Toque:** botão de bomba grande, como hoje; até três botões pequenos em volta dele, **escondidos** quando o jogador não tem aquilo:
  - **Remota:** aparece com a habilidade `remota`; esmaecido sem remota dele no mapa.
  - **Montaria:** aparece montado numa montaria com habilidade (sapo); esmaecido na recarga ou no ar.
  - **Especial:** aparece com personagem; um anel mostra a barra enchendo; aceso quando cheia.
- **Teclado:** `K` remota, `J` montaria, `L` especial (o `Shift` deixa de ser ação). Espaço continua sendo bomba.
- **Fantasma:** arremessa com o comando `bomb` (botão de bomba ou espaço); os botões pequenos somem.

## Regras — especiais

Parâmetros em `characters.json`, no campo `special` de cada personagem (durações em ms, convertidas para ticks na carga).

| Personagem | Especial | Regra |
| --- | --- | --- |
| Saci | *Redemoinho* (`teleport`, `tiles` 3) | Some e reaparece no centro do tile a 3 tiles na direção em que está virado; se o pouso não servir, tenta 2, depois 1. Pouso válido: dentro da grade, onde o Saci pode ficar, sem bomba. Atravessa qualquer coisa no meio. Instantâneo; cancela o deslize no gelo. Sem pouso válido, falha. |
| Boto | *Encanto* (`charm`, `durationMs` 2000) | O rival vivo mais próximo (distância Manhattan das posições; empate: menor id) tem os controles invertidos (cima ↔ baixo, esquerda ↔ direita) por 2 s: a direção segurada inverte na hora e cada `move` que chega durante o encanto entra invertido; ao acabar, desinverte a direção segurada. Sem rival vivo, falha. Encantar quem já está encantado reinicia a duração. |
| Mula sem Cabeça | *Disparada* (`dash`, `tiles` 4, `speedTilesPerSecond` 12) | Corre na direção em que está virada, a partir do centro do tile, até 4 tiles. Bloco quebrável no caminho é destruído na hora (`bloco.destruido`, revela item, sem energia). Para antes de parede, terreno onde ela não pode ficar ou bomba. Durante a corrida não anda nem solta bomba, mas pega item e chama normalmente. Nenhum tile livre à frente, falha. |
| Boitatá | *Rastro de fogo* (`fireTrail`, `durationMs` 3000) | Por 3 s, cada tile em que ele está (arredondado) pega fogo por `explosionTicks`, com o Boitatá como dono. A chama do rastro age como a de uma explosão (mata, detona bomba, queima mato e item) — **menos no próprio Boitatá**, que não é atingido pelas chamas que são dele. Chama de outra bomba no mesmo tile passa a ser do outro e o atinge. |
| Iara | *Maré* (`tide`, `durationMs` 4000, `speedMultiplier` 0,5) | Alaga a linha à frente dela: do tile dela, na direção em que está virada, até antes do primeiro tile onde não se anda (parede, bloco, água funda). Por 4 s, quem não é a Iara anda nesses tiles com a velocidade × 0,5 (acumula com o terreno). A maré não muda o terreno nem impede bomba. |
| Curupira | *Pegada falsa* (`decoy`, `durationMs` 4000) | Cria um clone no tile dele, que por 4 s anda espelhado: segue a direção oposta à que o Curupira segura, com as mesmas regras de movimento (colisão, terreno, curva). Bots veem o clone como um inimigo (perseguem e soltam bomba nele). Chama no tile do clone o desfaz (`especial.terminou`). O clone não pega item, não solta bomba, não morre esmagado (some). |

## Casos de borda

- Barra cheia e especial em duração (Boitatá, Iara, Curupira): a barra recomeça a encher já durante o especial.
- Encantado tentando usar `special`, `remote` ou `mount`: funcionam normalmente (só o movimento inverte).
- Mula em disparada atingida por chama: morre (ou perde a montaria / gasta o escudo), como sempre; a disparada para.
- Saci teleportando para um tile com chama: o fogo o atinge no mesmo tick.
- Rodada acaba durante um especial: tudo some com o mundo.
- Bomba remota e pulo no mesmo tick: comandos diferentes, ambos valem.

## Eventos

| Evento | Quando | Dados |
| --- | --- | --- |
| `energia.cheia` | a barra chegou ao máximo | `playerId` |
| `especial.usado` | especial começou | `playerId, characterId, special` |
| `especial.terminou` | especial com duração acabou (ou clone desfeito) | `playerId, characterId, special` |

`montaria.acao` continua para o pulo; `bloco.destruido` também sai da disparada.

## Dados

- `game.json`: `energy.max` (100), `energy.perBlock` (10), `energy.perKnockout` (40), `energy.perSecond` (1).
- `characters.json`: campo `special` por personagem (tabela acima), validado por `SpecialSchema` (união por `type`).
- `strings.pt-BR.json`: `controls.remote`, `controls.mount`, `controls.special`, `character.<id>.special` (nome do especial).

## Bots

- **Remota e pulo:** comandos `remote` e `mount` no lugar do `action`.
- **Especial (barra cheia):**
  - Saci: foge pelo teleporte quando não há tile seguro a pé e o pouso é seguro.
  - Boto: encanta quando o rival mais próximo está a ≤ 4 tiles.
  - Mula: dispara quando há bloco quebrável a ≤ 4 tiles à frente e o destino é seguro.
  - Boitatá: ativa o rastro quando um inimigo está a ≤ 3 tiles.
  - Iara: solta a maré quando um inimigo está na linha à frente dela.
  - Curupira: solta o clone quando um inimigo está a ≤ 4 tiles.
- Mapa de perigo: tiles do rastro de fogo do Boitatá são perigo para os outros (como chama), mas não para o próprio Boitatá (`world.flameFromTrail`).
- Os bots tratam o clone do Curupira como inimigo (caçam e soltam bomba nele); a maré atrasa as rotas deles como atrasa o movimento.

## Testes

`tests/core/energy.test.ts`, `tests/core/specials.test.ts`, `tests/input/PlayerInput.test.ts`, `e2e/smoke.spec.ts`:

- Energia: +10 por bloco da própria bomba (cadeia credita cada dono), +40 por rival morto, nada pela própria morte nem pelo esmagamento, +1 por segundo, para no máximo, zera na rodada seguinte, `energia.cheia` uma vez.
- Usar: sem barra cheia nada acontece; especial impossível não gasta a barra.
- Cada especial: casos da tabela e de borda (pouso de 3 → 2 → 1, encanto inverte e desinverte, disparada quebra bloco e para antes de parede/bomba, rastro não fere o Boitatá mas fere os outros, maré só à frente e não afeta a Iara, clone espelha e some na chama).
- Entrada: `K`/`J`/`L` geram `remote`/`mount`/`special`; fantasma arremessa com `bomb`.
- Bots: usam cada especial no caso descrito; sobrevivência nas 3 fases segue ≥ 90 %.
- E2E: o botão de especial aparece com anel; `?debug=1` ganha `+ energia` (enche a barra); `L` com o Saci teleporta.

## Pendências

- Especiais dos personagens originais (Zé Pavio e desbloqueáveis).
- Bots usam especial só nos casos simples acima.
- Sprites e efeitos dos especiais: placeholders até a arte final (passo 9).
