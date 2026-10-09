// E2E 辅助：向页面注入一张程序生成的 4×2 测试精灵图（透明背景 + 8 个带编号色块）
async page => {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d');
    for (let i = 0; i < 8; i++) {
      const x = (i % 4) * 64 + 32;
      const y = Math.floor(i / 4) * 64 + 32;
      ctx.fillStyle = `hsl(${i * 40}, 70%, 60%)`;
      ctx.beginPath();
      ctx.arc(x, y, 24 - (i % 3) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), x, y);
    }
    return c.toDataURL();
  });
  await page.evaluate(async (durl) => {
    const blob = await (await fetch(durl)).blob();
    const file = new File([blob], 'test_sheet.png', { type: 'image/png' });
    const inputs = document.querySelectorAll('input[type=file]');
    const input = inputs[1]; // 精灵表输入框
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, dataUrl);
  await page.waitForTimeout(600);
}
