// 验证坐标轴：导入精灵图 → 截图（开）→ 关闭坐标轴 → 截图（关）
async page => {
  await page.goto('http://127.0.0.1:5173/#/tools/frame-animator');
  await page.waitForTimeout(1000);
  await page.locator('input[type=file]').nth(1).setInputFiles(['h:/GameDevTools/mockup/test-green.jpg']);
  await page.waitForTimeout(1500);
  await page.getByText('智能识别（透明连通域）').click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '确认导入' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: './axes-on.png' });
  await page.getByRole('button', { name: '坐标轴' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: './axes-off.png' });
  return 'done';
}
