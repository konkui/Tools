// 绿幕图导入流程 v3：用 mockup 副本
async page => {
  await page.goto('http://127.0.0.1:5173/#/tools/frame-animator');
  await page.waitForTimeout(800);
  await page.locator('input[type=file]').nth(1).setInputFiles(['h:/GameDevTools/mockup/test-green.jpg']);
  await page.waitForTimeout(1500);
  const st1 = await page.evaluate(() => ({
    modal: !!document.querySelector('.modal'),
    text: document.querySelector('.modal')?.textContent?.slice(0, 80) ?? '',
  }));
  await page.screenshot({ path: './fk-dialog-auto.png' });
  if (!st1.modal) return 'NO MODAL: ' + JSON.stringify(st1);
  await page.getByText('智能识别（透明连通域）').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: './fk-smart.png' });
  await page.getByRole('button', { name: '确认导入' }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: './fk-imported.png' });
  return 'OK';
}
