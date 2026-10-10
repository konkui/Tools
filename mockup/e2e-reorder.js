// 验证排序：①列表按钮下移 ②时间轴拖拽
async page => {
  await page.goto('http://127.0.0.1:5173/#/tools/frame-animator');
  await page.waitForTimeout(1500);
  const firstName = () =>
    page.evaluate(() => document.querySelector('.frame-row .fdur')?.textContent ?? 'NONE');

  const before = await firstName();
  // ① 按钮：第一帧下移
  await page.locator('.frame-row').first().hover();
  await page.getByTitle('下移').first().click();
  await page.waitForTimeout(400);
  const afterBtn = await firstName();

  // ② 拖拽：时间轴第一帧拖到第二位（把刚才的换回来）
  await page.mouse.move(280, 858);
  await page.mouse.down();
  for (let x = 280; x <= 322; x += 8) {
    await page.mouse.move(x, 858);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForTimeout(400);
  const afterDrag = await firstName();

  await page.locator('.frame-row').first().hover();
  await page.screenshot({ path: './reorder.png' });
  return JSON.stringify({ before, afterBtn, afterDrag });
}
