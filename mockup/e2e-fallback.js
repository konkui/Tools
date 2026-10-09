// 无源图时点"重新切割"：应弹文件选择框，选完进入重新切割模式
async page => {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 5000 }),
    page.getByRole('button', { name: '重新切割' }).click(),
  ]);
  await chooser.setFiles(['h:/GameDevTools/mockup/test-green.jpg']);
  await page.waitForTimeout(1500);
  const title = await page.evaluate(
    () => document.querySelector('.modal-head span')?.textContent ?? 'NO MODAL',
  );
  await page.screenshot({ path: './rs-fallback.png' });
  return 'dialog title: ' + title;
}
