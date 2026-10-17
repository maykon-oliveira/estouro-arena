import { expect, test, type Page } from '@playwright/test';

/** Coleta erros de página e de console durante o teste. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/** Lê um valor do painel de debug (atributos data-* de .debug-panel). */
async function debugValue(page: Page, key: string): Promise<string> {
  return (await page.locator('.debug-panel').getAttribute(`data-${key}`)) ?? '';
}

async function holdKey(page: Page, key: string, ms: number): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

test('menus: Título → Batalha → Começar; a escolha fica salva', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.locator('.menu-title')).toHaveText('ESTOURO ARENA');
  await expect(page.locator('.bomb-button')).toBeHidden();
  await page.getByRole('button', { name: 'Jogar' }).click();

  await page.getByRole('radio', { name: 'Pantanal' }).click();
  await page.getByRole('radiogroup', { name: 'Bots' }).getByRole('radio', { name: '1' }).click();
  await page.getByRole('radio', { name: 'Fácil' }).click();
  await page.getByRole('button', { name: 'Começar' }).click();

  await expect(page.locator('#game canvas')).toBeVisible();
  await expect(page.locator('.match-hud')).toHaveAttribute('data-phase', 'countdown');
  await expect(page.locator('.hud-score')).toHaveCount(2);
  await expect(page.locator('.bomb-button')).toBeVisible();
  await expect(page.locator('#rotate-warning')).toBeHidden();

  await page.reload();
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('radio', { name: 'Pantanal' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.getByRole('radio', { name: 'Fácil' })).toHaveAttribute('aria-checked', 'true');
  expect(errors).toEqual([]);
});

test('pausa: o botão e o Esc abrem e fecham o menu de pausa', async ({ page }) => {
  await page.goto('/?seed=0&ia=0');
  await expect(page.locator('.match-hud')).toHaveAttribute('data-phase', 'playing', {
    timeout: 6_000,
  });
  await page.locator('.pause-button').click();
  await expect(page.locator('.menu')).toHaveAttribute('data-screen', 'pause');
  const clock = await page.locator('.hud-clock').textContent();
  await page.waitForTimeout(1_200);
  await expect(page.locator('.hud-clock')).toHaveText(clock ?? '');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('.menu')).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(page.locator('.menu')).toHaveAttribute('data-screen', 'pause');
  await page.keyboard.press('Escape');
  await expect(page.locator('.menu')).toBeHidden();
});

test('resultado: o bot vence, aparecem Revanche e Menu', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=0&ia=0&bots=1&winsToWin=1');
  await expect(page.locator('.match-hud')).toHaveAttribute('data-phase', 'playing', {
    timeout: 6_000,
  });
  await page.keyboard.press('Space'); // bomba no próprio spawn: o jogador perde a rodada
  await expect(page.locator('.menu')).toHaveAttribute('data-screen', 'result', {
    timeout: 8_000,
  });
  await expect(page.locator('.menu-result')).toHaveText('Azul venceu!');

  await page.getByRole('button', { name: 'Revanche' }).click();
  await expect(page.locator('.match-hud')).toHaveAttribute('data-phase', 'countdown');
  await page.locator('.pause-button').click();
  await page.getByRole('button', { name: 'Sair para o menu' }).click();
  await expect(page.locator('.menu-title')).toHaveText('ESTOURO ARENA');
  expect(errors).toEqual([]);
});

test('em retrato mostra o aviso de girar o aparelho', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('#rotate-warning')).toBeVisible();
  await expect(page.locator('#rotate-warning')).toHaveText('Gire o aparelho para jogar');
});

test('portão da Fase 0: o jogador explode um bloco e sobrevive', async ({ page }) => {
  const errors = collectErrors(page);
  // ?ia=0: adversários parados, para os blocos destruídos serem só os da bomba do jogador.
  await page.goto('/?seed=0&debug=1&ia=0');
  // Espera o fim da contagem ("3, 2, 1, Já!") e a simulação começar a rodar.
  await expect(page.locator('.match-hud')).toHaveAttribute('data-phase', 'playing', {
    timeout: 6_000,
  });
  await expect.poll(async () => Number(await debugValue(page, 'tick'))).toBeGreaterThan(5);
  const blocksBefore = Number(await debugValue(page, 'blocks'));

  // Seed 0: spawn em (1,1), chão em (2,1), bloco em (3,1) e chão em (1,2).
  // Bomba em (2,1) e esconderijo em (1,2), fora da cruz.
  await holdKey(page, 'ArrowRight', 350);
  await expect.poll(() => debugValue(page, 'tile')).toBe('2,1');
  await page.keyboard.press('Space');
  await expect.poll(() => debugValue(page, 'bombs')).toBe('1/1');
  await holdKey(page, 'ArrowLeft', 350);
  await holdKey(page, 'ArrowDown', 300);
  await expect.poll(() => debugValue(page, 'tile')).toBe('1,2');

  await expect
    .poll(async () => Number(await debugValue(page, 'blocks')), { timeout: 6_000 })
    .toBeLessThan(blocksBefore);
  expect(await debugValue(page, 'alive')).toBe('vivo');
  expect(errors).toEqual([]);
});

test('partida: contagem, "Já!" e relógio correndo', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=0');
  const hud = page.locator('.match-hud');
  await expect(hud).toHaveAttribute('data-phase', 'countdown');
  await expect(hud).toHaveAttribute('data-round', '1');
  await expect(page.locator('.hud-banner-sub')).toHaveText('Rodada 1');
  await expect(page.locator('.hud-clock')).toHaveText('2:00');
  await expect(page.locator('.hud-score')).toHaveCount(4);

  await expect(hud).toHaveAttribute('data-phase', 'playing', { timeout: 6_000 });
  await expect(page.locator('.hud-banner-text')).toHaveText('Já!');
  await expect(page.locator('.hud-clock')).toHaveText('1:59', { timeout: 3_000 });
  expect(errors).toEqual([]);
});

test('itens: o botão de debug dá fogo +1 e patins ao jogador', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=0&debug=1&ia=0');
  await expect(page.locator('.match-hud')).toHaveAttribute('data-phase', 'playing', {
    timeout: 6_000,
  });
  await expect.poll(() => debugValue(page, 'range')).toBe('2');
  await page.getByRole('button', { name: '+ fogo', exact: true }).click();
  await expect.poll(() => debugValue(page, 'range')).toBe('3');
  await page.getByRole('button', { name: '+ patins', exact: true }).click();
  await expect.poll(() => debugValue(page, 'speed')).toBe('1');
  expect(errors).toEqual([]);
});

test('remota: a bomba espera; K detona e o botão de ação acende', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=0&debug=1&ia=0&touch=1');
  await expect(page.locator('.match-hud')).toHaveAttribute('data-phase', 'playing', {
    timeout: 6_000,
  });
  const action = page.locator('.action-button');
  await expect(action).toBeVisible();
  await expect(action).toHaveClass(/unavailable/);

  await page.getByRole('button', { name: '+ remota', exact: true }).click();
  // Anda até (2,1) e solta: a cruz não pega o esconderijo (1,2).
  await holdKey(page, 'ArrowRight', 350);
  await page.keyboard.press('Space');
  await expect.poll(() => debugValue(page, 'bombs')).toBe('1/1');
  await expect(action).not.toHaveClass(/unavailable/);
  await holdKey(page, 'ArrowLeft', 350);
  await holdKey(page, 'ArrowDown', 300);
  await page.waitForTimeout(3_000); // mais que o pavio de 2,5 s
  expect(await debugValue(page, 'bombs')).toBe('1/1');

  await page.keyboard.press('KeyK');
  await expect.poll(() => debugValue(page, 'bombs')).toBe('0/1');
  await expect(action).toHaveClass(/unavailable/);
  expect(await debugValue(page, 'alive')).toBe('vivo');
  expect(errors).toEqual([]);
});

for (const mapId of ['pantanal_01', 'tundra_01']) {
  test(`fase ${mapId} carrega por ?map= sem erros`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`/?map=${mapId}&debug=1&seed=1`);
    await expect.poll(() => debugValue(page, 'map')).toBe(mapId);
    await expect(page.locator('.match-hud')).toHaveAttribute('data-phase', 'playing', {
      timeout: 6_000,
    });
    await page.waitForTimeout(1_000);
    expect(errors).toEqual([]);
  });
}

test('montaria: ovo de sapo acende o botão de ação e K pula 2 tiles', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=0&debug=1&ia=0&touch=1');
  await expect(page.locator('.match-hud')).toHaveAttribute('data-phase', 'playing', {
    timeout: 6_000,
  });
  const action = page.locator('.action-button');
  await expect(action).toHaveClass(/unavailable/);
  await page.getByRole('button', { name: '+ ovo_sapo_saltador', exact: true }).click();
  await expect(action).not.toHaveClass(/unavailable/);

  // Seed 0: spawn (1,1), chão em (1,2) e (1,3). Vira para baixo e pula de (1,1) para (1,3).
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => debugValue(page, 'tile')).toBe('1,1');
  await page.keyboard.press('KeyK');
  await expect.poll(() => debugValue(page, 'tile')).toBe('1,3');
  await expect(action).toHaveClass(/unavailable/); // recarga
  expect(errors).toEqual([]);
});

test('morte súbita: com a rodada curta, aparece o aviso e o relógio fica vermelho', async ({
  page,
}) => {
  const errors = collectErrors(page);
  // Rodada de 32 s: a morte súbita (30 s) começa 2 s depois do "Já!".
  await page.goto('/?seed=0&ia=0&roundMs=32000');
  const hud = page.locator('.match-hud');
  await expect(hud).toHaveAttribute('data-phase', 'playing', { timeout: 6_000 });
  await expect(hud).toHaveAttribute('data-sudden', '1', { timeout: 5_000 });
  await expect(page.locator('.hud-banner-text')).toHaveText('Morte súbita!');
  expect(errors).toEqual([]);
});

test('fantasma: quem morre vira fantasma na borda e arremessa uma bomba', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=0&debug=1&ia=0&touch=1');
  await expect(page.locator('.match-hud')).toHaveAttribute('data-phase', 'playing', {
    timeout: 6_000,
  });
  // Solta a bomba no spawn e fica: morre na explosão.
  await page.keyboard.press('Space');
  await expect.poll(() => debugValue(page, 'alive'), { timeout: 5_000 }).toBe('morto');
  // Depois de 1,5 s vira fantasma em (1,0); o botão de ação acende para o arremesso.
  const action = page.locator('.action-button');
  await expect(action).not.toHaveClass(/unavailable/, { timeout: 4_000 });
  await page.keyboard.press('Space');
  // A bomba voa e pousa em (1,3): o painel conta as bombas do jogador 0 (o fantasma).
  await expect.poll(() => debugValue(page, 'bombs'), { timeout: 3_000 }).toBe('1/1');
  await expect(action).toHaveClass(/unavailable/);
  expect(errors).toEqual([]);
});

test('bots: com o jogador parado, os adversários quebram blocos sozinhos', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=0&debug=1&nivel=dificil');
  await expect(page.locator('.match-hud')).toHaveAttribute('data-phase', 'playing', {
    timeout: 6_000,
  });
  const blocksBefore = Number(await debugValue(page, 'blocks'));
  await expect
    .poll(async () => Number(await debugValue(page, 'blocks')), { timeout: 8_000 })
    .toBeLessThan(blocksBefore);
  expect(errors).toEqual([]);
});
