// 合成验证 v2：在工具页内生成测试图（白底 + 蓝圆 + 灰蓝描边 + 内部白点）
async page => {
  await page.goto('http://127.0.0.1:5173/#/tools/frame-animator');
  await page.waitForTimeout(800);
  await page.evaluate(() => indexedDB.deleteDatabase('gamedevkit'));
  await page.reload();
  await page.waitForTimeout(1200);

  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 300; c.height = 300;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 300, 300);
    ctx.strokeStyle = '#a8b4d8'; // 距白色约 120，容差 90 之外
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(150, 150, 80, 0, 7); ctx.stroke();
    ctx.fillStyle = '#2b4acb';
    ctx.beginPath(); ctx.arc(150, 150, 77, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffffff'; // 内部白点
    ctx.beginPath(); ctx.arc(150, 150, 15, 0, 7); ctx.fill();
    const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
    const file = new File([blob], 'synth.png', { type: 'image/png' });
    const input = document.querySelectorAll('input[type=file]')[1];
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(1500);

  const setRange = (idx, v) => page.evaluate(([i, val]) => {
    const el = [...document.querySelectorAll('.modal input[type=range]')][i];
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, String(val));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, [idx, v]);

  await setRange(1, 0);
  await page.waitForTimeout(600);
  await page.screenshot({ path: './syn-erode0.png', clip: { x: 350, y: 100, width: 560, height: 330 } });
  await setRange(1, 3);
  await page.waitForTimeout(600);
  await page.screenshot({ path: './syn-erode3.png', clip: { x: 350, y: 100, width: 560, height: 330 } });
  return 'done';
}
