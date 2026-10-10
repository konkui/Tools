// 白边验证：白底抗锯齿 JPEG → 色度键 v2 → 放大检查边缘
async page => {
  await page.goto('http://127.0.0.1:5173/#/tools/frame-animator');
  await page.waitForTimeout(800);
  await page.evaluate(() => indexedDB.deleteDatabase('gamedevkit'));
  await page.reload();
  await page.waitForTimeout(1200);

  // 生成测试图：白底 + 抗锯齿红圆 + 蓝方块，JPEG q0.8 压缩（制造边缘噪点）
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 200;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 400, 200);
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.arc(100, 100, 60, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(250, 40, 110, 120);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.8));
    const file = new File([blob], 'aa-test.jpg', { type: 'image/jpeg' });
    const input = document.querySelectorAll('input[type=file]')[1];
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: './fr-dialog.png' });

  // 智能识别 → 应切出 2 帧
  await page.getByText('智能识别（透明连通域）').click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '确认导入' }).click();
  await page.waitForTimeout(1500);

  // 放大到 8 倍看边缘
  await page.evaluate(() => {
    const sliders = [...document.querySelectorAll('.fa-controls input[type=range]')];
    const zoomSlider = sliders[sliders.length - 1];
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(zoomSlider, '8');
    zoomSlider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: './fr-stage.png' });
  const count = await page.evaluate(() => document.querySelectorAll('.frame-row').length);
  return 'frames: ' + count;
}
