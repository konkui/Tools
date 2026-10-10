// 白描边实测：对比 侵蚀0 vs 侵蚀2 的处理预览，然后导入验证
async page => {
  await page.goto('http://127.0.0.1:5173/#/tools/frame-animator');
  await page.waitForTimeout(800);
  await page.evaluate(() => indexedDB.deleteDatabase('gamedevkit'));
  await page.reload();
  await page.waitForTimeout(1200);
  await page.locator('input[type=file]').nth(1).setInputFiles(['h:/GameDevTools/mockup/test-outline.png']);
  await page.waitForTimeout(1800);

  const setRange = (idx, v) => page.evaluate(([i, val]) => {
    const el = [...document.querySelectorAll('.modal input[type=range]')][i];
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, String(val));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, [idx, v]);

  // 基线：侵蚀 0
  await setRange(1, 0);
  await page.waitForTimeout(700);
  await page.screenshot({ path: './ol-erode0.png' });
  // 侵蚀 2
  await setRange(1, 2);
  await page.waitForTimeout(700);
  await page.screenshot({ path: './ol-erode2.png' });

  // 智能识别，minSize=30 过滤坐标轴刻度文字碎块
  await page.getByText('智能识别（透明连通域）').click();
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const nums = [...document.querySelectorAll('.modal input[type=number]')];
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(nums[0], '30');
    nums[0].dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: '确认导入' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: './ol-stage.png' });
  const count = await page.evaluate(() => document.querySelectorAll('.frame-row').length);
  return 'frames: ' + count;
}
