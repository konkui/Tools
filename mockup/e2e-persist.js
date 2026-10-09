// 验证持久化：刷新后项目恢复；首页最近项目有记录
async page => {
  // 等待自动保存落库（防抖 1200ms）
  await page.waitForTimeout(1800);
  // 回到帧列表再刷新
  await page.reload();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: './fa-restored.png' });
  // 首页最近项目
  await page.goto('http://127.0.0.1:5173/#/');
  await page.waitForTimeout(800);
  await page.screenshot({ path: './fa-hub-recent.png' });
}
