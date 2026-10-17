# Partida e rodadas

**Status:** feita (Fase 1, passo 1). GDD §2 (vitória, morte súbita), §3 (Batalha).

## Regras

- **Partida:** 1 jogador humano (id 0) + 1 a 3 bots (ids 1–3), escolhidos no menu (até lá, `?bots=N`, padrão 3, limitado pelos spawns do mapa). Cada jogador nasce num spawn, na ordem de `grid.spawns`. Os bots são controlados pelos [bots](bots.md) (passo 2); `?ia=0` os deixa parados.
- **Melhor de 3:** vence a partida quem chegar a `match.winsToWin` (2) vitórias de rodada. Empates não contam e não têm limite (a [morte súbita](morte-subita.md) faz a rodada terminar).
- **Rodada:**
  1. **Contagem** (`match.countdownMs`, 3 s): grade nova, jogadores no spawn, mundo parado (não roda `step`), relógio parado. `bomb` é ignorado; `move` só registra a direção segurada, que passa a valer no "Já!" — assim quem já segura uma direção sai andando sem precisar soltar e apertar de novo.
  2. **Jogo:** relógio de `match.roundMs` (120 s) descendo. Nos últimos `suddenDeath.durationMs` começa a [morte súbita](morte-subita.md).
  3. **Fim:** quando restam ≤ 1 jogador vivo, espera `match.roundEndDelayMs` (2 s) com a simulação rodando (comandos aceitos, relógio descendo até 0); o vivo ao fim da espera vence. Se ninguém sobra → empate. Se o relógio zera com 2+ vivos → empate na hora.
- **Grade nova a cada rodada:** a rodada `r` (a partir de 1) usa a seed `seed + (r − 1)`: a 1ª rodada usa a própria seed da partida (`?seed=0` continua dando o mesmo mapa) e cada rodada pode ser reproduzida sozinha.
- **Direção segurada** fica na partida (`heldDirs`), não no mundo, e passa de uma rodada para a outra.
- O estado da partida (`Match`, em [`src/core/match.ts`](../../src/core/match.ts)) fica no core: rodada atual, fase (`countdown | playing | ending | over`), ticks da fase, relógio, vitórias por jogador, mundo da rodada. `createMatch` emite a contagem da 1ª rodada; `stepMatch` avança 1 tick. Substitui o reinício automático da Fase 0 (`match.restartDelayMs` sai do `game.json`).
- **Pausa** continua fora do core: a cena para de chamar `step` (botão de pausa, `visibilitychange`).
- **HUD mínimo** (até o [menu e HUD](menus-e-hud.md)), em DOM (`src/ui/MatchHud.ts`): relógio `m:ss` no topo (segundos arredondados para cima: começa em 2:00, chega a 0:00 só no fim), vitórias de cada jogador em pontos na cor dele, avisos centrais: "3", "2", "1", "Já!" (por `hud.goBannerMs`), "Vermelho venceu a rodada!" / "Empate!", e no fim "Vermelho venceu a partida!" — a tela de Resultado ([menus e HUD](menus-e-hud.md)) oferece Revanche e Menu. O HUD expõe `data-phase` e `data-round` para os testes e2e.
- Cores dos jogadores em `render.playerColors` (vermelho, azul, verde, amarelo); nomes das cores em `strings.pt-BR.json`.

## Casos de borda

- Os dois últimos morrem no mesmo tick → empate.
- O último vivo morre durante a espera de fim → empate (ex.: a própria bomba).
- Relógio zera durante a espera de fim → vale a espera (quem estiver vivo no fim dela vence).
- `bomb` na contagem → ignorado; `move` na contagem só registra a direção. Qualquer comando depois do fim da partida → ignorado.
- Bombas e chamas não passam de uma rodada para a outra.

## Eventos

| Evento | Quando | Dados |
| --- | --- | --- |
| `rodada.contagem` | começa a contagem | `round` |
| `rodada.iniciou` | fim da contagem, relógio começa | `round` |
| `rodada.terminou` | fim da espera de fim, ou relógio zerado | `round, winnerId \| null, wins` (cópia) |
| `partida.terminou` | alguém chegou a `winsToWin` | `winnerId, wins` |

## Dados

`match.winsToWin` (2), `match.roundMs` (120000), `match.countdownMs` (3000), `match.roundEndDelayMs` (2000), `hud.goBannerMs` (800), `render.playerColors`. Textos em `strings.pt-BR.json` (`round.go`, `round.win`, `round.draw`, `match.win`, `match.restart`, `player.color.0`–`3`), com `{player}` substituído por `t(chave, { player })`.

## Testes

[`tests/core/match.test.ts`](../../tests/core/match.test.ts), [`tests/ui/hudModel.test.ts`](../../tests/ui/hudModel.test.ts), [`e2e/smoke.spec.ts`](../../e2e/smoke.spec.ts):

- Vitória: 4 jogadores, mata 3 → `rodada.terminou` com o vencedor após a espera.
- Empate por morte simultânea, por morte na espera e por tempo.
- Contagem ignora comandos; relógio não anda na contagem.
- `partida.terminou` na 2ª vitória; empates não contam.
- Mesma seed → mesma sequência de grades por rodada; rodada 1 = grade da seed da partida.
- Direção segurada na contagem vale no "Já!" e atravessa a troca de rodada.
- UI: formatação do relógio e da contagem ([`tests/ui/`](../../tests/ui/)).
- E2E: o portão da Fase 0 espera o fim da contagem (`data-phase=playing`).

## Pendências

- Espalhar os power-ups de quem morre pelo mapa (clássico do gênero) — avaliar depois do playtest.
- Escolha de número de bots e dificuldade no menu: [menus e HUD](menus-e-hud.md).
