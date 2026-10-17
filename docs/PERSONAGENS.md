# Estouro Arena — Personagens e Montarias

> Cópia em Markdown do documento vivo. Versão de 17/10/2026. Ids entre crases são os usados em `src/data/`.

O elenco de Estouro Arena vem do folclore brasileiro e da fauna nacional: tudo de domínio público ou original, sem usar nomes de pessoas reais.

## 1. Elenco principal (folclore)

Seis personagens jogáveis, cada um com uma **passiva** (sempre ativa) e um **especial** (liberado quando a barra de energia enche). Todos começam com os mesmos atributos base; a passiva é a única vantagem fixa.

| Personagem | Inspiração | Passiva | Especial | Cor-tema |
| --- | --- | --- | --- | --- |
| **Saci** (`saci`) | Travesso que some num redemoinho | Velocidade +1 desde o início | *Redemoinho:* teleporta 3 tiles na direção do joystick | Vermelho (gorro) |
| **Boitatá** (`boitata`) | Serpente de fogo que protege os campos | Alcance da explosão +1 | *Rastro de fogo:* por 3 s, deixa chamas por onde passa | Laranja e azul |
| **Iara** (`iara`) | Senhora dos rios | Anda na água rasa sem ficar lenta | *Maré:* alaga uma linha, deixando quem está nela lento | Verde-água |
| **Curupira** (`curupira`) | Protetor da mata, pés virados | Fica invisível no mato alto, mesmo se mexendo | *Pegada falsa:* cria um clone que anda ao contrário por 4 s | Verde e ruivo |
| **Boto** (`boto`) | Encantador dos rios amazônicos | Já começa com o poder de chutar bombas | *Encanto:* inverte os controles do rival mais próximo por 2 s | Rosa |
| **Mula sem Cabeça** (`mula_sem_cabeca`) | Corre soltando fogo pelo pescoço | Imune à primeira chama da partida | *Disparada:* investida de 4 tiles que derruba blocos quebráveis | Marrom e amarelo |

### Personalidade (para animações e falas curtas)

- **Saci:** debochado, assobia, ri depois de cada armadilha.
- **Boitatá:** solene, olhos brilhando, protetor.
- **Iara:** elegante e confiante, canta ao vencer.
- **Curupira:** desconfiado, esconde-se atrás das folhas.
- **Boto:** galanteador, usa chapéu, tira o chapéu ao vencer.
- **Mula sem Cabeça:** impulsiva, bufa fogo quando fica parada.

## 2. Personagens originais (desbloqueáveis)

Cinco personagens criados para o jogo. Cada um homenageia um **arquétipo** brasileiro, nunca uma pessoa real.

| Personagem | Arquétipo | Passiva | Especial | Como desbloquear |
| --- | --- | --- | --- | --- |
| **Zé Pavio** (`ze_pavio`) | Mascote do jogo, moleque de rua esperto | Pavio das bombas 0,5 s mais curto | *Estopim:* detona todas as suas bombas de uma vez | Disponível desde o início |
| **Tião Rojão** (`tiao_rojao`) | Fogueteiro de festa junina | Bombas soltam faíscas que quebram 1 bloco extra | *Girândola:* lança 3 bombas em leque | Vencer o mundo Pantanal |
| **Lia Faísca** (`lia_faisca`) | Pilota de kart, competitiva | Arrancada: velocidade máxima mais rápida de atingir | *Drift:* desliza pelo gelo e água sem perder controle por 4 s | Vencer 10 batalhas |
| **Dona Fumaça** (`dona_fumaca`) | Quituteira de fogão a lenha | Bombas deixam fumaça que esconde por 1 s | *Cortina:* nuvem que esconde tudo num raio de 3 tiles | Completar 7 desafios diários |
| **Biba Estalinho** (`biba_estalinho`) | Passista de escola de samba | Pula por cima de bombas | *Batucada:* empurra todas as bombas num raio de 2 tiles | Vencer o mundo Cidade neon |

**Zé Pavio** é o rosto do jogo: tela inicial, ícone do app e tutorial.

## 3. Chefe final: a Cuca

A **Cuca** (`cuca`) é a vilã da campanha: roubou o fogo dos rojões de festa e espalhou blocos encantados pelos biomas. Não é jogável. Aparece como chefe no último mundo e manda capangas nos anteriores.

| Fase da luta | Ataque | Como vencer |
| --- | --- | --- |
| 1 | Caldeirão: arremessa poções que viram blocos quebráveis | Explodir os blocos para abrir caminho até ela |
| 2 | Sono: área roxa que deixa o jogador parado por 2 s | Sair da área antes de fechar |
| 3 | Fúria: invoca chamas em padrão de xadrez | Ler o padrão e se mover nas casas livres |

Uma explosão que atinge a Cuca tira 1 de 3 corações por fase da luta. Capangas: sapos encantados, morcegos, corujas-sombra, com IA simples.

## 4. Montarias (fauna brasileira)

Sete montarias saem de ovos escondidos sob blocos. Montado, o jogador ganha a habilidade da criatura (botão de ação especial) e um escudo: o primeiro golpe derruba só a montaria. Cada uma sobe até o nível 3 ao derrotar inimigos montado.

| Montaria | Habilidade | Nível 2 | Nível 3 | Bioma mais comum |
| --- | --- | --- | --- | --- |
| **Tatu-bola** (`tatu_bola`) | Rola em linha reta empurrando bombas | Rola mais rápido | Derruba bloco quebrável ao bater | Floresta |
| **Sapo-saltador** (`sapo_saltador`) | Pula por cima de 1 bloco | Pula 2 blocos | Pula e cai soltando uma bomba | Pantanal |
| **Capivara** (`capivara`) | Nada na água rasa e funda sem perder velocidade | Atravessa lama sem perder velocidade | Imune ao gelo escorregadio | Pantanal |
| **Besouro-aríete** (`besouro_ariete`) | Investida curta que quebra 1 bloco | Quebra 2 blocos em linha | Investida empurra rivais | Fábrica |
| **Coruja** (`coruja`) | Revela inimigos no mato e salta 2 tiles | Visão ampliada no escuro | Revela itens dentro dos blocos | Cidade neon |
| **Tamanduá** (`tamandua`) | Língua puxa um item ou bomba a até 3 tiles | Alcance de 4 tiles | Puxa um rival 1 tile | Floresta |
| **Arara** (`arara`) | Plana por cima de água ou buraco (até 2 tiles) | Plana 3 tiles | Voo rasante solta 2 bombas | Vulcão |

A cor do ovo indica a montaria, para o jogador decidir se vale ir buscar.

## 5. Diretrizes de arte e propriedade intelectual

**Arte:** cada personagem precisa ser reconhecível pela silhueta e pela cor-tema, mesmo em 32 × 32 px.

- Sprites: andar em 4 direções (4 quadros cada), parado, soltar bomba, morrer, vitória.
- Montarias: andar em 4 direções + animação da habilidade; o personagem aparece por cima.
- Retratos de menu em resolução maior; avatares de perfil podem vir do DiceBear.
- Prompt base para o PixelLab: `pixel art 32x32, top-down 3/4 view, chibi proportions, bold outline, <personagem>, <cor-tema>, transparent background`.

**Propriedade intelectual:**

- As lendas do folclore são de domínio público, mas **versões específicas** não são. Não basear o visual em adaptações de TV, desenhos ou livros recentes; criar design próprio.
- Os personagens originais homenageiam arquétipos; não usar nome, rosto, bordão ou marca de nenhuma pessoa real.
- Antes de lançar, checar a marca "Estouro Arena" no INPI e o domínio.
