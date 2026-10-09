// 视频抽帧 E2E：MediaRecorder 现场录制测试视频 → 注入视频输入框 → 抽 8 帧
async page => {
  await page.goto('http://127.0.0.1:5173/#/tools/frame-animator');
  await page.waitForTimeout(800);
  await page.evaluate(() => indexedDB.deleteDatabase('gamedevkit'));
  await page.reload();
  await page.waitForTimeout(1200);

  // 页面内录制 1.5s 测试视频：白底 + 移动的红球
  await page.evaluate(async () => {
    const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm']
      .find((m) => MediaRecorder.isTypeSupported(m));
    const c = document.createElement('canvas');
    c.width = 320; c.height = 180;
    const ctx = c.getContext('2d');
    const stream = c.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: mime });
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise((res) => (rec.onstop = res));
    rec.start();
    const t0 = performance.now();
    const animate = () => {
      const t = (performance.now() - t0) / 1000;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 320, 180);
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(30 + (260 * t) / 1.5, 90 + 30 * Math.sin(t * 6), 20, 0, 7);
      ctx.fill();
      if (t < 1.5) requestAnimationFrame(animate);
      else rec.stop();
    };
    animate();
    await done;
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
    const file = new File([new Blob(chunks, { type: mime })], `test_run.${ext}`, { type: mime.split(';')[0] });
    const input = document.querySelectorAll('input[type=file]')[2];
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: './vd-dialog.png' });

  // 固定帧数 8（number 输入框顺序：起始、结束、采样值、输出高度）
  await page.getByText('固定帧数').click();
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('.modal input[type=number]')][2];
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, '8');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: './vd-params.png' });
  await page.getByRole('button', { name: '抽取并导入' }).click();
  await page.waitForTimeout(8000);
  await page.screenshot({ path: './vd-imported.png' });
  const count = await page.evaluate(() => document.querySelectorAll('.frame-row').length);
  return 'frames: ' + count;
}
