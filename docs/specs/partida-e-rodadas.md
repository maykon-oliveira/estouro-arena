# Partida e rodadas

**Status:** planejada (Fase 1, passo 1). GDD §2 (vitória, morte súbita), §3 (Batalha).

## Regras

- **Partida:** 1 jogador humano (id 0) + 1 a 3 bots (ids 1–3), escolhidos no menu (até lá, `?bots=N`, padrão 3). Cada jogador nasce num spawn, na ordem de `grid.spawns`.
- **Melhor de 3:** vence a partida quem chegar a `match.winsToWin` (2) vitórias de rodada. Empates não contam e não têm limite (a morte súbita garante que a rodada termina).
- **Rodada:**
  1. **Contagem** (`match.countdownMs`, 3 s): grade nova, jogadores no spawn, comandos ignorados, relógio parado.
  2. **Jogo:** relógio de `match.roundMs` (120 s) descendo. Nos últimos `suddenDeath.durationMs` começa a [morte súbita](morte-subita.md).
  3. **Fim:** quando restam ≤ 1 jogador vivo, espera `match.roundEndDelayMs` (2 s) com a simulação rodando; o vivo ao fim da espera vence. Se ninguém sobra → empate. Se o relógio zera com 2+ vivos → empate.
- **Grade nova a cada rodada:** a seed da rodada `r` é derivada da seed da partida (`seed + r`), para a rodada poder ser reproduzida sozinha.
- O estado da partida (`match`) fica no core: rodada atual, fase (`countdown | playing | ending | over`), ticks restantes, vitórias por jogador. Substitui o reinício automático da Fase 0 (`match.restartDelayMs` sai do `game.json`).
- **Pausa** continua fora do core: a cena para de chamar `step` (botão de pausa, `visibilitychange`).
- **HUD mínimo** (até o [menu e HUD](menus-e-hud.md)): relógio `m:ss` no topo, vitórias de cada jogador na cor dele, texto de contagem e de fim de rodada.

## Casos de borda

- Os dois últimos morrem no mesmo tick → empate.
- O último vivo morre durante a espera de fim → empate (ex.: a própria bomba).
- Relógio zera durante a espera de fim → vale a espera (quem estiver vivo no fim dela vence).
- Comando chegando na contagem ou depois do fim da partida → ignorado.
- Bombas e chamas não passam de uma rodada para a outra.

## Eventos

| Evento | Quando | Dados |
| --- | --- | --- |
| `rodada.contagem` | começa a contagem | `round` |
| `rodada.iniciou` | fim da contagem, relógio começa | `round` |
| `rodada.terminou` | fim da espera de fim, ou relógio zerado | `round, winnerId \| null, wins` |
| `partida.terminou` | alguém chegou a `winsToWin` | `winnerId, wins` |

## Dados

`match.winsToWin` (2), `match.roundMs` (120000), `match.countdownMs` (3000), `match.roundEndDelayMs` (2000). Textos em `strings.pt-BR.json` (`round.countdown`, `round.go`, `round.win`, `round.draw`, `match.win`).

## Testes

- Vitória: 4 jogadores, mata 3 → `rodada.terminou` com o vencedor após a espera.
- Empate por morte simultânea, por morte na espera e por tempo.
- Contagem ignora comandos; relógio não anda na contagem.
- `partida.terminou` na 2ª vitória; empates não contam.
- Mesma seed → mesma sequência de grades por rodada.

## Pendências

- Espalhar os power-ups de quem morre pelo mapa (clássico do gênero) — avaliar depois do playtest.
- Escolha de número de bots e dificuldade no menu: [menus e HUD](menus-e-hud.md).
