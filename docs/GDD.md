# Estouro Arena — Documento de Design do Jogo (GDD)

> Cópia em Markdown do documento vivo, para o agente de IA ler no repositório. Versão de 17/10/2026. Ao mudar o design, atualize este arquivo.
> Elenco completo: [PERSONAGENS.md](PERSONAGENS.md).

## 1. Visão geral

**Estouro Arena** é um jogo de arena com bombas em grade, para navegador mobile na horizontal, inspirado no gênero clássico dos anos 90 e reimaginado com arte moderna, terrenos variados e mecânicas novas.

**Pitch em uma frase:** coloque bombas, quebre blocos, pegue power-ups e monte criaturas para ser o último de pé — em mapas vivos com água, mato alto, gelo e esteiras.

| Item | Definição |
| --- | --- |
| Plataforma | Navegador mobile (Chrome/Safari), modo paisagem, instalável como PWA |
| Público | Jogadores casuais e nostálgicos, 12+ anos |
| Sessão típica | Partidas de 2 a 3 minutos |
| Jogadores | 1 jogador contra bots no MVP; multiplayer depois |
| Monetização | Fora do escopo por enquanto |

### Pilares de design

1. **Leitura instantânea:** tudo que importa (bomba, alcance, perigo) é visível de relance numa tela de celular.
2. **Partidas curtas e caóticas:** cada rodada termina rápido e dá vontade de jogar outra.
3. **O mapa é um personagem:** o terreno muda a estratégia, não é só decoração.
4. **Tudo é dado, não código:** fases, itens, criaturas e sprites ficam em arquivos JSON fáceis de trocar — ideal para editar com IA.

### Nota sobre propriedade intelectual

A referência é o *gênero*, não o jogo. Para poder publicar sem risco, o projeto usa nome, personagens, criaturas montáveis e arte **próprios**. Não usar o nome Bomberman, os personagens da Hudson/Konami, nem sprites extraídos dos jogos originais. Mecânicas genéricas (grade, bombas, explosão em cruz, power-ups) são livres.

## 2. Gameplay central

O jogador anda numa grade de tiles, solta bombas que explodem em cruz após um tempo, destrói blocos para abrir caminho e achar itens, e elimina inimigos ou rivais. Uma explosão que atinge outra bomba a detona em cadeia.

### Regras básicas

- **Grade:** 15 × 13 tiles (padrão), com câmera que rola em mapas maiores.
- **Movimento:** livre em 4 direções, com "encaixe" suave nos corredores (assistência de curva — essencial no touch).
- **Bomba:** pavio de 2,5 s; explode em cruz com alcance N; atravessa chão, para em parede fixa, destrói o primeiro bloco quebrável.
- **Vida:** 1 toque de fogo = perde a vida/montaria. Montaria absorve um golpe.
- **Vitória:** campanha = derrotar todos os inimigos e chegar à saída; batalha = último sobrevivente ou mais pontos ao fim do tempo.
- **Morte súbita:** nos 30 s finais, blocos caem das bordas para o centro.

### Controles (mobile, horizontal)

| Zona da tela | Controle | Detalhe |
| --- | --- | --- |
| Metade esquerda | Joystick virtual flutuante | Aparece onde o polegar toca; 4 direções com zona morta |
| Direita, botão grande | Soltar bomba | Área de toque generosa (≥ 72 px) |
| Direita, botão menor | Ação especial | Chutar, detonar remoto, habilidade da montaria |
| Topo | Pausa e HUD | Tempo, vidas, itens ativos |

Suportar também teclado e gamepad (útil para testar no PC). Vibração curta (Vibration API) ao explodir e ao morrer.

### Power-ups clássicos

| Item | Efeito |
| --- | --- |
| Bomba +1 | Mais uma bomba simultânea |
| Fogo +1 | Alcance da explosão +1 |
| Fogo máximo | Alcance máximo |
| Patins | Velocidade +1 nível |
| Chute | Empurra bombas, que deslizam até bater |
| Luva | Pega e arremessa bombas por cima de blocos |
| Bomba remota | Detona quando o jogador quiser |
| Bomba perfurante | A explosão atravessa blocos quebráveis |
| Atravessar blocos | Anda por dentro de blocos quebráveis |
| Caveira (maldição) | Efeito negativo aleatório, passa para quem encostar |

### Montarias

Ovos aparecem sob blocos. Ao pegar um, o jogador monta uma criatura da fauna brasileira que dá uma habilidade e serve de escudo extra. As 7 montarias (tatu-bola, sapo-saltador, capivara, besouro-aríete, coruja, tamanduá, arara), com habilidades e níveis, estão em [PERSONAGENS.md §4](PERSONAGENS.md#4-montarias-fauna-brasileira).

Criaturas sobem de nível ao derrotar inimigos montado.

## 3. Modos de jogo

O MVP tem só o modo Batalha contra bots; Campanha e multiplayer vêm depois, reaproveitando o mesmo motor.

| Modo | Descrição | Quando |
| --- | --- | --- |
| Batalha (bots) | 1 jogador vs 1–3 bots, melhor de 3 rodadas, escolha de mapa | MVP |
| Campanha | Mundos temáticos com 5–8 fases cada; inimigos com IA própria e um chefe por mundo | Fase 2 |
| Desafios diários | Mapa + regras sorteados por seed do dia, ranking local | Fase 3 |
| Multiplayer online | 2–4 jogadores em tempo real (WebSocket/WebRTC) | Fase 4 |
| Editor de fases | Jogador monta o mapa e compartilha por código | Futuro |

**Bots:** comportamento simples por regras (fugir do raio das bombas, buscar itens, encurralar o jogador), com 3 níveis de dificuldade. Lógica pura e testável no core.

## 4. Terrenos e fases

Cada tile do mapa tem um tipo de terreno com propriedades próprias (velocidade, visibilidade, se bloqueia fogo), definido em JSON. Um terreno novo é só uma entrada nova no arquivo, sem mexer no motor.

### Tipos de terreno

| Terreno (id) | Efeito no jogador | Efeito na bomba/fogo |
| --- | --- | --- |
| Chão (`chao`) | Normal | Normal |
| Parede fixa (`parede`) | Bloqueia | Bloqueia fogo |
| Bloco quebrável (`bloco`) | Bloqueia | Destruído; pode soltar item |
| Água rasa (`agua_rasa`) | Velocidade −40% | Bomba não pode ser solta (afunda); a chutada para antes |
| Água funda (`agua_funda`) | Intransponível (exceto capivara) | Fogo passa por cima |
| Mato alto (`mato_alto`) | Esconde quem está dentro (só aparece um contorno ao se mexer) | Pega fogo e vira chão |
| Gelo (`gelo`) | Desliza até parar em obstáculo ou sair do gelo | Normal (a bomba chutada já desliza até bater) |
| Lama/areia (`lama`) | Velocidade −25% | Normal |
| Esteira (`esteira`) | Empurra numa direção | Carrega bombas junto |
| Teleporte, em par (`teleporte`) | Entra num, sai no outro | Bomba chutada também teleporta |
| Buraco (`buraco`) | Cai e perde a vida | Bomba some |
| Ponte frágil (`ponte_fragil`) | Passável 2 vezes, depois cai | Explosão a derruba |
| Lava/rachadura (`lava`) | Mata ao pisar | Normal |
| Ventilador (`ventilador`) | Empurra a cada 2 s | Desvia bombas chutadas |

### Formatos de mapa além do retângulo

- **Mapas com ilhas:** áreas ligadas por pontes destrutíveis — destruir a ponte isola o rival.
- **Formas irregulares:** em L, em cruz, circulares (tiles "vazio" fora da área jogável).
- **Mapas maiores com câmera:** 25 × 15 tiles com rolagem, para batalhas de 4.
- **Mapas em camadas:** rampas que levam a um nível alto (pontes) — fase futura.
- **Paredes desenhadas à mão + blocos aleatórios:** o layout fixo vem do arquivo da fase; os blocos quebráveis são sorteados por densidade, garantindo área livre nos pontos de nascimento.

### Biomas (mundos)

| Bioma | Terrenos destaque | Gimmick |
| --- | --- | --- |
| Pantanal | Água rasa, mato alto, lama | Jacarés surgem da água |
| Tundra | Gelo, neve | Bombas congeladas demoram mais para explodir |
| Fábrica | Esteiras, teleportes | Prensas que descem em ritmo |
| Vulcão | Lava, rachaduras | Erupções que destroem blocos aleatórios |
| Cidade neon | Ventiladores, pontes | Apagões: só se vê perto do jogador |
| Floresta | Mato alto, troncos rolantes | Árvores que caem após explosão |

### Formato de uma fase (exemplo)

Cada fase é um arquivo JSON. Com o editor gratuito **Tiled** dá para desenhar visualmente e exportar.

```json
{
  "id": "pantanal_01",
  "bioma": "pantanal",
  "tamanho": [15, 13],
  "legenda": { "#": "parede", ".": "chao", "~": "agua_rasa", "\"": "mato_alto", "P": "spawn" },
  "mapa": [
    "###############",
    "#P..~~~...\"\".P#"
  ],
  "blocos": { "densidade": 0.6, "itens": { "bomba": 6, "fogo": 6, "patins": 3, "ovo": 2 } },
  "musica": "pantanal_tema"
}
```

## 5. Novas dinâmicas propostas

Escolher 2 ou 3 para a identidade do jogo e deixar o resto como variações de regra.

### Bombas especiais

- **Bomba elemental:** fogo (padrão), gelo (congela terreno e jogadores por 1 s), água (apaga mato, cria poça), vento (empurra tudo no raio).
- **Bomba-mina:** fica invisível no chão até alguém pisar.
- **Bomba-cluster:** ao explodir, solta 4 mini-bombas nas pontas da cruz.
- **Bomba-ímã:** puxa bombas e jogadores próximos por 1 s antes de explodir.
- **Bomba pegajosa:** gruda no primeiro jogador que tocar.
- **Bomba de fumaça:** não mata; cobre a área e esconde tudo por 4 s.

### Habilidades e progressão

- **Carga de energia:** cada bloco destruído enche uma barra; cheia, libera o especial do personagem (ver PERSONAGENS.md).
- **Personagens com passiva:** cada personagem tem uma vantagem fixa.
- **Loadout antes da partida:** escolher 1 item inicial entre 3 sorteados.
- **Upgrades em rodada (estilo roguelite) na campanha:** ao fim de cada fase, escolher 1 de 3 cartas de bônus.

### Mapa vivo

- **Zona encolhendo (battle royale):** a área segura diminui em etapas.
- **Eventos no meio da partida:** chuva de meteoros, maré que alaga corredores, apagão.
- **Ciclo dia/noite:** à noite, visão reduzida em volta de cada jogador.
- **Terreno que reage ao fogo:** mato queima e espalha, gelo derrete e vira água.
- **Caixas de suprimento:** caem em pontos marcados a cada 30 s, com item raro.

### Interação social e modos

- **Fantasma vingador:** quem morre vira fantasma na borda e pode arremessar 1 bomba por rodada.
- **Capture a bandeira e rei da colina** em mapas grandes.
- **Co-op contra chefe:** 2 jogadores vs um chefe gigante com padrões de ataque.
- **Emotes rápidos** e replays de 10 s da melhor jogada.

### Prioridade sugerida

| Dinâmica | Impacto | Esforço | Fase |
| --- | --- | --- | --- |
| Terrenos (água, mato, gelo) | Alto | Médio | MVP |
| Fantasma vingador | Alto | Baixo | MVP |
| Bombas elementais | Alto | Médio | Fase 2 |
| Carga de energia + especiais | Médio | Médio | Fase 2 |
| Eventos no mapa | Médio | Médio | Fase 3 |
| Zona encolhendo | Médio | Baixo | Fase 3 |
| Co-op contra chefe | Alto | Alto | Fase 4 |

## 6. Arte e assets

DiceBear para avatares e retratos (perfil, HUD, nomes dos bots) e, enquanto não houver arte final, para as **texturas de terreno** (estilos abstratos CC0, gerados no desenvolvimento). Sprites jogáveis com ferramenta própria para jogos (PixelLab, pago — adiado). Detalhes e convenções em [ASSETS.md](ASSETS.md).

| Ferramenta | Serve para | Atenção |
| --- | --- | --- |
| [DiceBear](https://www.dicebear.com) | Avatares, retratos, texturas de terreno (provisórias) | Licença varia por estilo; usar só os CC0 |
| [PixelLab](https://pixellab.ai/) | Personagens, animações, tilesets, UI | Tem [MCP](https://www.pixellab.ai/docs/ways-to-use-pixellab) para usar direto do agente; pago para uso intenso |
| [Kenney.nl](https://kenney.nl/assets) | Placeholders | CC0, visual genérico |
| Aseprite / Pixelorama | Ajustes e spritesheets | Pixelorama é grátis no navegador |

**Estilo:** pixel art 32 × 32 por tile (escalado 2–3× no celular).

## 7. Arquitetura técnica

Phaser + TypeScript + Vite, com a lógica do jogo isolada da renderização.

```
Dados em JSON (fases, terrenos, itens, criaturas, manifesto)
            │
Entrada ──► Simulação do jogo (TypeScript puro, tick 60/s, sem Phaser)
            │ emite eventos
            ▼
Barramento de eventos (bomba.explodiu, jogador.morreu, item.pego, fase.vencida)
     │               │                │
 Render (Phaser)   Áudio          Rede (futuro)
```

A simulação só recebe comandos e emite eventos; render, áudio e rede apenas escutam. Som novo = assinar um evento, sem tocar na lógica.

### Som extensível (desde o MVP)

```ts
export interface AudioService {
  play(soundId: string): void;
  music(trackId: string | null): void;
}
export class SilentAudio implements AudioService {
  play() {}
  music() {}
}
// data/sounds.json mapeia evento → som: { "bomba.explodiu": "sfx_boom" }
```

### Cuidados de mobile

- Forçar paisagem: bloqueio de orientação funciona em tela cheia/PWA; fora disso, aviso "gire o aparelho".
- Escala `FIT` com letterbox e `pixelArt: true`.
- Respeitar o notch com `env(safe-area-inset-*)` no HUD.
- Pausar quando o app sai de foco (`visibilitychange`).
- Meta: 60 fps num Android intermediário; testar cedo em aparelho real.

## 8. Fluxo IA-first

Contexto fixo (CLAUDE.md, este GDD, ASSETS.md, DECISIONS.md) + tarefas pequenas e verificáveis. Ciclo: especificar → testes → implementar → ver na tela → ajustar dados → commit pequeno. Ver [CLAUDE.md](../CLAUDE.md).

## 9. Roadmap

Cada fase só começa quando o portão da anterior é cumprido.

| Fase | Conteúdo | Portão para avançar |
| --- | --- | --- |
| 0 — Fundação | Vite + Phaser + TS, CLAUDE.md, testes, deploy; grade, joystick, bomba e explosão em cruz; placeholders Kenney; painel de debug | Um jogador explode blocos no celular real |
| 1 — MVP: Batalha | 1 jogador vs 3 bots, melhor de 3, morte súbita; 8 power-ups (todos menos luva e caveira), 2 montarias (capivara e sapo-saltador); terrenos água rasa e funda, mato, gelo, lama; 3 mapas; fantasma vingador; menus e HUD. Specs em `docs/specs/` | Amigos jogam 10 partidas seguidas sem bug grave |
| 2 — Arte e conteúdo | Sprites finais (PixelLab), tema visual, avatares DiceBear; campanha com 2 biomas de 6 fases e 1 chefe cada; bombas elementais e carga de energia | 60 fps num Android intermediário |
| 3 — Polimento | Som (Howler.js), vibração, PWA instalável; desafio diário, eventos no mapa, zona encolhendo; lançamento público | Jogadores voltam para jogar de novo |
| 4 — Online | Multiplayer 2–4 via WebSocket; co-op contra chefe; editor de fases | — |

## 10. Perguntas em aberto

- [x] Nome definitivo: **Estouro Arena**. Elenco: folclore + originais (ver PERSONAGENS.md).
- [ ] Estilo visual: pixel art 32 px (padrão atual) ou vetorial cartoon?
- [ ] Quais 2–3 dinâmicas novas viram a "marca" do jogo?
- [ ] Multiplayer online é objetivo real? (Muda o quanto investir em determinismo agora.)
- [ ] Publicar só como PWA ou também nas lojas (via Capacitor)?
- [ ] Orçamento para ferramentas pagas de arte (PixelLab) e domínio/hospedagem.
