// 绿幕图导入 v4：重置数据 → 容差 130 → 智能识别+合并 → 验证 10 帧
async page => {
  await page.goto('http://127.0.0.1:5173/#/tools/frame-animator');
  await page.waitForTimeout(600);
  await page.evaluate(() => indexedDB.deleteDatabase('gamedevkit'));
  await page.reload();
  await page.waitForTimeout(1000);
  await page.locator('input[type=file]').nth(1).setInputFiles(['h:/GameDevTools/mockup/test-green.jpg']);
  await page.waitForTimeout(1500);
  // 容差调到 130（连深绿投影一起去除）
  await page.evaluate(() => {
    const slider = document.querySelector('.modal input[type=range]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(slider, '130');
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(800);
  // 智能识别模式
  await page.getByText('智能识别（透明连通域）').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: './fk2-smart.png' });
  await page.getByRole('button', { name: '确认导入' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: './fk2-imported.png' });
  const count = await page.evaluate(() => document.querySelectorAll('.frame-row').length);
  return 'frames: ' + count;
}
