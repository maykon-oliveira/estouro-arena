# Personagens e passivas

**Status:** feita (Fase 2, passo 1). GDD §5 ("personagens com passiva"), [PERSONAGENS §1](../PERSONAGENS.md#1-elenco-principal-folclore). Depende de [itens](itens-e-power-ups.md), [terrenos](terrenos.md) e [montarias](montarias.md).

A Fase 1 tinha 4 jogadores iguais, distinguidos pela cor. Agora cada jogador é um dos **6 personagens do folclore**, com uma **passiva** (vantagem fixa). O especial de cada um fica para o passo 2 ([carga de energia](README.md)). Os personagens originais (Zé Pavio e os desbloqueáveis) ficam para depois.

## Regras

- **Catálogo** em `src/data/characters.json`: `id` e `passive`. Todos os campos de `passive` são opcionais e a passiva é **só dados**: o core aplica os campos, sem `if (personagem === 'saci')`.

  | Campo | Efeito | Quem usa |
  | --- | --- | --- |
  | `speedLevel` | níveis de patins ao nascer | Saci (1) |
  | `range` | alcance a mais ao nascer | Boitatá (1) |
  | `abilities` | habilidades de item ao nascer | Boto (`["chute"]`) |
  | `terrainOverrides` | sobreposição de terreno, como a das montarias | Iara (`agua_rasa` → `speedMultiplier: 1`) |
  | `flameShields` | chamas absorvidas por rodada | Mula sem Cabeça (1) |
  | `hiddenWhileMoving` | no mato alto, some também andando (só render) | Curupira (`true`) |

- **Mesma base:** todos começam com os atributos de `game.json` (`startBombs`, `startRange`, velocidade). A passiva soma por cima e os limites (`maxRange`, `maxSpeedLevel`) não mudam: o Saci chega ao máximo com um patins a menos, e o Boitatá com um fogo a menos.
- **Rodadas:** a passiva é reaplicada a cada rodada (o mundo é recriado). O escudo da Mula volta em cada rodada.
- **Terreno efetivo:** sobreposição da montaria → sobreposição do personagem → terreno. A Iara na capivara usa a capivara (que também não fica lenta na água rasa). Movimento e rotas dos bots usam o mesmo terreno efetivo.
- **Escudo da Mula (`flameShields`):** chama no tile de um jogador vivo, não montado, não invulnerável e com escudo restante → gasta 1 escudo e fica invulnerável por `character.shieldInvulnerableMs` (1000), para a mesma explosão não matá-la no tick seguinte (`personagem.escudo`). **Montada**, quem absorve é a montaria e o escudo da Mula fica guardado. O escudo **não** salva da morte súbita (esmagada), como o da montaria.
- **Curupira (`hiddenWhileMoving`):** no mato, o render não desenha nada mesmo se ele se mexe (os outros personagens mostram um contorno andando). O jogador humano sempre se vê (meio transparente). A visão dos bots não muda: escondido a mais de 1 tile, ninguém vê ninguém.
- **Escolha:** a tela Batalha ganha a linha **Personagem** (avatar, nome e passiva em uma linha); a escolha é salva com o resto (`BattleSettings.character`, padrão `saci`). Atalho de URL: `?personagem=<id>`.
- **Bots:** sorteados com a seed da partida entre os personagens que o jogador **não** escolheu, sem repetir (Fisher–Yates com o RNG do core). A mesma seed dá os mesmos personagens; os bots mantêm o personagem nas três rodadas.
- **Cor e nome:** a cor continua sendo do lugar (jogador 1 vermelho, 2 azul…), e o nome mostrado é o do personagem ("Saci venceu a rodada!").
- **Avatar:** retrato DiceBear 10 estilo `pixel-art` (CC0), um por personagem, gerado no desenvolvimento (`bun run avatars`) a partir de `assets/themes/default/avatars.dicebear.json` e versionado como SVG. Nome lógico `avatar.<id>`, resolvido pelo `manifest.json` do tema. Aparece na escolha, no placar do HUD e no Resultado.

## Casos de borda

- Mula montada atingida → perde a montaria (escudo da montaria), mantém o próprio escudo.
- Mula invulnerável depois do escudo e ainda na chama quando a invulnerabilidade acaba → morre, se não tiver outro escudo.
- Boto pega o item `chute` → nada muda (já tinha a habilidade); o item é consumido normalmente.
- Saci com `maxSpeedLevel` patins → o patins seguinte não passa do limite.
- Iara perdendo a capivara na água funda → vai para o tile andável mais próximo, como qualquer um (a passiva só vale para a água rasa).
- Personagem salvo que não existe mais (dados mudaram) ou `?personagem=` inválido → cai no padrão.
- Fantasma: a passiva não vale para o fantasma (ele não anda no mapa nem é atingido).
- Partida com `character: null` (testes do core, dados antigos) → jogador sem passiva, como na Fase 1.

## Eventos

| Evento | Quando | Dados |
| --- | --- | --- |
| `personagem.escudo` | o escudo do personagem absorveu uma chama | `playerId, characterId` |

## Dados

- `src/data/characters.json` (novo, `CharactersSchema`): 6 entradas, `saci`, `boitata`, `iara`, `curupira`, `boto`, `mula_sem_cabeca`. Habilidades e terrenos citados são validados contra `items.json` e `terrains.json` na carga.
- `game.json`: `character.shieldInvulnerableMs` (1000).
- `strings.pt-BR.json`: `character.<id>.name`, `character.<id>.passive`, `menu.character`.
- `assets/themes/default/avatars.dicebear.json` + `avatars/<id>.svg` + entradas `avatar.<id>` no `manifest.json`.

## Testes

`tests/core/characters.test.ts`, `tests/data/schemas.test.ts`, `tests/ui/menus.test.ts`, `e2e/smoke.spec.ts`:

- Dados reais: 6 personagens válidos, ids citados existem.
- Cada passiva: Saci com velocidade nível 1, Boitatá com alcance 3, Boto chuta, Iara sem lentidão na água rasa (e a montaria tem prioridade), Mula sobrevive à 1ª chama e morre na 2ª, escudo guardado quando montada, escudo não salva do esmagamento, escudo volta na rodada seguinte.
- Limites: Saci não passa de `maxSpeedLevel`.
- Sorteio dos bots: sem repetir, sem o personagem do jogador, mesma seed = mesmo sorteio.
- Bots: rota da Iara pela água rasa custa como chão.
- Configurações: personagem salvo e inválido; `?personagem=`.
- E2E: escolher a Iara na tela Batalha e começar → HUD mostra o avatar e o nome dela.

## Pendências

- Especiais e barra de energia: passo 2.
- Zé Pavio e os desbloqueáveis (PERSONAGENS §2): com a campanha e os desafios.
- Bots não aproveitam a passiva de propósito (a Mula não se arrisca mais por ter escudo).
- Sprite do personagem na arena: segue o círculo da cor do lugar até a arte final (passo 9).
