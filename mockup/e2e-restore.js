// 恢复：重新切割 5×2 替换全部，回到干净的 10 帧鸣人
async page => {
  await page.getByRole('button', { name: '重新切割' }).click();
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const setNumEl = (el, v) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const nums = [...document.querySelectorAll('.modal input[type=number]')];
    setNumEl(nums[0], '5');
    setNumEl(nums[1], '2');
  });
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '确认导入' }).click();
  await page.waitForTimeout(1200);
  const c = await page.evaluate(() => document.querySelectorAll('.frame-row').length);
  await page.screenshot({ path: './rs-final.png' });
  return 'frames: ' + c;
}
