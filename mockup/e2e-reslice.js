// 验证：重新切割（源图 5×2 网格替换全部） + 切割此帧（2×2 原位细分）
async page => {
  await page.goto('http://127.0.0.1:5173/#/tools/frame-animator');
  await page.waitForTimeout(1800);

  const setNum = (idx, v) => {
    const el = [...document.querySelectorAll('.modal input[type=number]')][idx];
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  // 0) 先导入一次精灵表（旧持久化数据无源图），导入后源图即被记录
  await page.locator('input[type=file]').nth(1).setInputFiles(['h:/GameDevTools/mockup/test-green.jpg']);
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: '取消' }).click();
  await page.waitForTimeout(400);

  // 1) 重新切割
  await page.getByRole('button', { name: '重新切割' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: './rs-dialog.png' });
  await page.evaluate(() => {
    const setNumEl = (el, v) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const nums = [...document.querySelectorAll('.modal input[type=number]')];
    setNumEl(nums[0], '5');
    setNumEl(nums[1], '2');
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: './rs-grid.png' });
  await page.getByRole('button', { name: '确认导入' }).click();
  await page.waitForTimeout(1200);
  const c1 = await page.evaluate(() => document.querySelectorAll('.frame-row').length);

  // 2) 切割此帧：选中第 1 帧，细分为 2×2
  await page.locator('.frame-row').first().click();
  await page.getByRole('button', { name: '切割此帧' }).click();
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const setNumEl = (el, v) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const nums = [...document.querySelectorAll('.modal input[type=number]')];
    setNumEl(nums[0], '2');
    setNumEl(nums[1], '2');
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: './rs-sub.png' });
  await page.getByRole('button', { name: '确认切割' }).click();
  await page.waitForTimeout(900);
  const c2 = await page.evaluate(() => document.querySelectorAll('.frame-row').length);
  await page.screenshot({ path: './rs-after-sub.png' });
  return `after reslice: ${c1}, after subdivide: ${c2}`;
}
