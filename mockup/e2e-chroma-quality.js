async page => {
  await page.goto('http://127.0.0.1:5173/#/tools/frame-animator');
  await page.reload();
  return page.evaluate(async () => {
    const { removeSolidBackground } = await import('/src/core/image/chromaKey.ts');
    const passed = [];
    const assert = (ok, message) => { if (!ok) throw new Error(message); };
    const pixels = canvas => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const pixel = (canvas, x, y) => [...pixels(canvas).slice((y * canvas.width + x) * 4, (y * canvas.width + x) * 4 + 4)];
    const same = (a, b) => a.every((v, i) => v === b[i]);
    const make = (bg, fg, alpha = 0.65) => {
      const c = document.createElement('canvas');
      c.width = c.height = 48;
      const ctx = c.getContext('2d');
      ctx.fillStyle = `rgb(${bg})`;
      ctx.fillRect(0, 0, 48, 48);
      ctx.fillStyle = `rgb(${fg.map((v, i) => Math.round(v * alpha + bg[i] * (1 - alpha)))})`;
      ctx.fillRect(15, 15, 18, 18);
      ctx.fillStyle = `rgb(${fg})`;
      ctx.fillRect(16, 16, 16, 16);
      return c;
    };
    for (const [name, bg, fg] of [
      ['白底', [255, 255, 255], [32, 68, 136]],
      ['绿底', [0, 255, 0], [160, 42, 90]],
      ['暗底', [12, 20, 30], [210, 180, 120]],
    ]) {
      for (const a of [0.4, 0.65, 0.9]) {
        const source = make(bg, fg, a);
        const result = removeSolidBackground(source).canvas;
        const edge = pixel(result, 15, 24);
        assert(edge.slice(0, 3).every((v, i) => Math.abs(v - fg[i]) <= 4), `${name}/${a} 边缘颜色污染: ${edge}`);
        assert(Math.abs(edge[3] - Math.round(a * 255)) <= 2, `${name}/${a} 边缘透明度错误: ${edge}`);
        assert(same(pixel(result, 24, 24), [...fg, 255]), `${name} 内部细节改变`);
        assert(pixel(result, 0, 0)[3] === 0, `${name} 背景未清除`);
        assert(result.width === 48 && result.height === 48, '输出尺寸改变');
      }
      passed.push(`${name}边缘颜色/透明度/内部像素/原始尺寸`);
    }
    const fg = [32, 68, 136];
    const source = make([255, 255, 255], fg);
    const ctx = source.getContext('2d');
    ctx.fillStyle = `rgb(${fg})`;
    ctx.fillRect(4, 12, 1, 25);
    ctx.fillStyle = '#fff';
    ctx.fillRect(23, 23, 2, 2);
    const result = removeSolidBackground(source).canvas;
    assert(same(pixel(result, 4, 24), [...fg, 255]), '单像素细线被削弱');
    assert(same(pixel(result, 23, 23), [255, 255, 255, 255]), '内部白色细节被误删');
    assert(pixel(removeSolidBackground(source, 90, false).canvas, 23, 23)[3] === 0, '全局去背未去除封闭背景');
    passed.push('单像素细线、封闭浅色细节与全局去背');
    const off = removeSolidBackground(source, 90, true, 0, 0).canvas;
    assert(same(pixel(off, 15, 24), pixel(source, 15, 24)), '关闭去色污染仍改变边缘');
    passed.push('去色污染开关');
    const layered = make([255, 255, 255], fg);
    const lc = layered.getContext('2d');
    const coverages = [0.4, 0.65, 0.9, 1];
    coverages.forEach((a, i) => {
      lc.fillStyle = `rgb(${fg.map(v => Math.round(v * a + 255 * (1 - a)))})`;
      lc.fillRect(13 + i, 13 + i, 22 - i * 2, 22 - i * 2);
    });
    const layeredResult = removeSolidBackground(layered).canvas;
    coverages.forEach((a, i) => {
      const edge = pixel(layeredResult, 13 + i, 24);
      assert(edge.slice(0, 3).every((v, c) => Math.abs(v - fg[c]) <= 4), `多层白边仍残留底色: ${edge}`);
      assert(Math.abs(edge[3] - Math.round(a * 255)) <= 2, '多层白边透明度错误');
    });
    passed.push('三像素宽混色边缘');
    const img = ctx.getImageData(15, 24, 1, 1);
    for (const alpha of [64, 128, 252]) {
      img.data.set([...fg, alpha]);
      ctx.putImageData(img, 15, 24);
      assert(same(pixel(removeSolidBackground(source).canvas, 15, 24), pixel(source, 15, 24)), '已有半透明像素被改写');
    }
    passed.push('原有半透明像素保持不变');
    ctx.clearRect(0, 0, 48, 10);
    ctx.clearRect(0, 38, 48, 10);
    ctx.clearRect(0, 0, 10, 48);
    ctx.clearRect(38, 0, 10, 48);
    const padded = removeSolidBackground(source);
    assert(same(padded.bgColor, [255, 255, 255]), '透明边框干扰背景采样');
    assert(pixel(padded.canvas, 11, 24)[3] === 0, '洪泛无法穿过透明边框');
    passed.push('透明边框采样与洪泛');
    const empty = document.createElement('canvas');
    empty.width = empty.height = 1;
    const emptyResult = removeSolidBackground(empty);
    assert(emptyResult.removedRatio === 0 && pixel(emptyResult.canvas, 0, 0)[3] === 0, '全透明小图异常');
    passed.push('全透明/1px图片');
    const blob = await new Promise(resolve => result.toBlob(resolve, 'image/png'));
    const bitmap = await createImageBitmap(blob);
    const decoded = document.createElement('canvas');
    decoded.width = bitmap.width;
    decoded.height = bitmap.height;
    decoded.getContext('2d').drawImage(bitmap, 0, 0);
    assert(same(pixel(decoded, 24, 24), pixel(result, 24, 24)), 'PNG往返改变内部像素');
    assert(same(pixel(decoded, 15, 24), pixel(result, 15, 24)), 'PNG往返改变边缘');
    bitmap.close();
    passed.push('PNG导出往返一致性');
    return { passed };
  });
}
