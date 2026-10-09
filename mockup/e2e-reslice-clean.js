// 干净验证：有源图时点"重新切割"直接弹窗，标题/默认替换正确
async page => {
  await page.evaluate(() => indexedDB.deleteDatabase('gamedevkit'));
  await page.reload();
  await page.waitForTimeout(1200);
  // 先导入一次建立源图（setInputFiles 不弹系统选择框，不会打断脚本）
  await page.locator('input[type=file]').nth(1).setInputFiles(['h:/GameDevTools/mockup/test-green.jpg']);
  await page.waitForTimeout(1200);
  const t1 = await page.evaluate(() => document.querySelector('.modal-head span')?.textContent);
  // 关掉导入对话框
  await page.getByRole('button', { name: '取消' }).click();
  await page.waitForTimeout(400);
  // 有源图时点重新切割
  await page.getByRole('button', { name: '重新切割' }).click();
  await page.waitForTimeout(800);
  const t2 = await page.evaluate(() => ({
    title: document.querySelector('.modal-head span')?.textContent ?? 'NO MODAL',
    replaceOn: [...document.querySelectorAll('.radio-pill')].some(
      (el) => el.textContent === '替换全部帧' && el.classList.contains('on'),
    ),
  }));
  await page.screenshot({ path: './rs-clean.png' });
  return JSON.stringify({ importTitle: t1, reslice: t2 });
}
