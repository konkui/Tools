// 设置行数=2 并截图；再切到智能识别模式截图对比
async page => {
  await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('.modal input[type=number]')];
    const rowsInput = inputs[1];
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(rowsInput, '2');
    rowsInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: './fa-grid.png' });
  // 切到智能识别
  await page.getByText('智能识别（透明连通域）').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: './fa-smart.png' });
}
