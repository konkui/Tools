// 确认导入 → 截图工作区 → 播放 → 截图 → 保存到库 → 素材库截图
async page => {
  // 确认导入（当前处于智能识别模式，8 帧）
  await page.getByRole('button', { name: '确认导入' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: './fa-imported.png' });

  // 播放 1 秒
  await page.getByTitle('播放 (空格)').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: './fa-playing.png' });
  await page.getByTitle('暂停 (空格)').click();

  // 保存到库
  await page.getByRole('button', { name: '保存到库' }).click();
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('.modal input')];
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(inputs[0], '彩球弹跳');
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    setter.call(inputs[1], '测试, 色块');
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: './fa-library.png' });
}
