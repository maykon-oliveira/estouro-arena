# Arte provisória em SVG: jogadores, montarias, itens e bombas

**Status:** feita (Fase 2, arte provisória, antes do passo 3). Complementa [texturas DiceBear](tema-dicebear.md) e [personagens](personagens-e-passivas.md). A arte final continua sendo o passo 9 da Fase 2.

Até aqui, só o terreno tinha textura; jogadores, montarias, itens e bombas eram formas coloridas. Agora tudo na arena vem do `manifest.json` do tema por nome lógico, em SVG CC0 ou original.

## Regras

- **Jogador** (`player.<personagem>`): o avatar DiceBear `pixel-art` do personagem, recortado em círculo (`borderRadius` 50), gerado por `bun run avatars` junto com os retratos (`avatars/<id>_token.svg`). Na arena, a ficha tem ~80 % do tile, com um **anel na cor do lugar** (vermelho, azul…) e um **entalhe** no anel apontando para onde o jogador está virado. Sem personagem ou sem textura: o círculo colorido de antes.
- **Montaria** (`mount.<id>`): SVG original visto de cima (capivara, sapo), desenhado sob a ficha, deslocado para baixo para aparecer por baixo do jogador; vira para a esquerda/direita conforme o jogador.
- **Itens** (`item.<id>`): ícone SVG original para cada um dos 8 power-ups e os 2 ovos, num fundo arredondado (power-ups) ou em forma de ovo (ovos).
- **Bomba** (`bomb.default`): SVG original; o render continua pulsando (mais rápido perto de explodir) e deslizando a bomba chutada. A bomba do fantasma em voo usa a mesma imagem.
- **Clone** do Curupira: igual à ficha do Curupira (é para enganar).
- Chamas, maré, aviso da morte súbita e grade seguem desenhados por formas (efeitos), como hoje.
- **Desempenho:** imagens de itens e bombas vêm de um *pool* reaproveitado a cada quadro (nada de criar objeto por quadro); as fichas e montarias são uma imagem por jogador, criadas na cena.
- **Arte original:** os SVGs de montarias, itens e bomba são desenhados à mão no repositório (`assets/themes/default/sprites/`), sem inspiração em jogos ou adaptações existentes; `CREDITS.md` registra a origem.

## Casos de borda

- Mato alto: a ficha segue as regras de [terrenos](terrenos.md) (meio transparente para o jogador local; o anel só aparece andando para os outros; o Curupira some de vez).
- Fantasma: ficha menor e translúcida sobre o anel da borda.
- Invulnerável: a ficha pisca, como antes.
- Item desconhecido no tema: o quadrado colorido de reserva.

## Dados

- `avatars.dicebear.json` ganha `token` (opções extras da ficha: `borderRadius` 50); `bun run avatars` gera `avatars/<id>.svg` e `avatars/<id>_token.svg` e as entradas `avatar.<id>` e `player.<id>`.
- `sprites/*.svg` e as entradas `mount.*`, `item.*`, `bomb.default` no `manifest.json` (`source: "original"`).

## Testes

- `tests/render/theme.test.ts`: todo personagem tem `player.<id>`; toda montaria tem `mount.<id>`; todo item tem `item.<id>`; existe `bomb.default`.
- E2E: a partida carrega as texturas sem erro no console (smoke existente).
- Verificação visual no navegador (812 × 375).

## Pendências

- Animação de andar (frames por direção): com a arte final (passo 9).
- Ícones dos botões pequenos (📡 🐸 ⚡) seguem em emoji.
