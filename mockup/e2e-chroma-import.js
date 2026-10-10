async page => {
  await page.goto('http://127.0.0.1:5173/#/tools/frame-animator');
  await page.reload();
  const passed = [];
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  await page.locator('input[type=file][accept^=image]:not([multiple])').waitFor({ state: 'attached' });
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 480; c.height = 240;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 480, 240);
    ctx.fillStyle = '#75869f'; ctx.fillRect(159, 39, 162, 162);
    ctx.fillStyle = '#304060'; ctx.fillRect(160, 40, 160, 160);
    ctx.fillStyle = '#fff'; ctx.fillRect(200, 80, 10, 10);
    const blob = await new Promise(resolve => c.toBlob(resolve));
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], 'chroma-quality.png', { type: 'image/png' }));
    const input = document.querySelector('input[type=file][accept^=image]:not([multiple])');
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const confirm = page.getByRole('button', { name: '确认导入', exact: true });
  await confirm.waitFor();
  await page.getByRole('button', { name: '智能识别（透明连通域）', exact: true }).click();
  await page.getByLabel('预览缩放', { exact: true }).selectOption('4');
  await page.getByLabel('预览底色', { exact: true }).selectOption('dark');
  await page.getByRole('checkbox', { name: '切割框', exact: true }).uncheck();
  const preview = page.locator('.sheet-preview img');
  await preview.evaluate(img => img.decode());
  assert(await preview.evaluate(img => img.naturalWidth === 480 && img.width === 1920 && getComputedStyle(img).imageRendering === 'pixelated'), '像素预览尺寸或插值错误');
  assert(await page.locator('.fa-key-preview-scroll').evaluate(el => el.scrollWidth > el.clientWidth), '放大预览无法水平滚动');
  passed.push('4倍像素预览、深色底与滚动');
  await page.getByRole('checkbox', { name: '原图', exact: true }).check();
  const originalURL = await preview.getAttribute('src');
  await page.getByRole('checkbox', { name: '原图', exact: true }).uncheck();
  assert(originalURL !== await preview.getAttribute('src'), '原图对照没有切换');
  passed.push('原图对照');
  const pending = await page.getByLabel('边缘去色污染', { exact: true }).evaluate(async input => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '0');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(requestAnimationFrame);
    return document.querySelector('.modal-foot .btn.primary').disabled;
  });
  assert(pending, '调参后仍允许导入旧结果');
  await confirm.waitFor();
  await preview.evaluate(img => img.decode());
  assert(await preview.evaluate(img => {
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    return ctx.getImageData(159, 100, 1, 1).data[3] === 255;
  }), '未采用最新的关闭去色污染参数');
  await page.getByLabel('边缘去色污染', { exact: true }).fill('100');
  await confirm.waitFor();
  await page.getByLabel('预览缩放', { exact: true }).selectOption('1');
  passed.push('调参防抖期间禁止导入、采用最新结果');
  await confirm.click();
  await page.locator('.modal').waitFor({ state: 'hidden' });
  assert(await page.locator('.frame-row').count() > 0, '精灵表未导入帧');
  passed.push('精灵表去背与切割导入');
  const videoChecks = await page.evaluate(async () => {
    const { loadVideo, extractFrames, releaseVideo } = await import('/src/tools/frame-animator/logic/videoExtract.ts');
    const { removeSolidBackground } = await import('/src/core/image/chromaKey.ts');
    const assert = (ok, message) => { if (!ok) throw new Error(message); };
    const file = await fetch('/mockup/test-run.mp4').then(r => {
      if (!r.ok) throw new Error('缺少测试视频 mockup/test-run.mp4');
      return r.blob();
    });
    const loaded = await loadVideo(file);
    const items = [];
    const opts = { chromaKey: false, tolerance: 90, edgeOnly: true, erodePx: 0, targetHeight: 0, namePrefix: 'quality' };
    try {
      const raw = (await extractFrames(loaded.video, [0], opts))[0]; items.push(raw);
      assert(raw.bitmap.width === loaded.info.width && raw.bitmap.height === loaded.info.height, '原尺寸视频被缩小');
      const c = document.createElement('canvas'); c.width = loaded.info.width; c.height = loaded.info.height;
      const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(raw.bitmap, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      assert(data.some((v, i) => i % 4 === 3 && v > 0), '视频首帧尚未解码，抽出了空帧');
      const expected = removeSolidBackground(c).canvas;
      const native = (await extractFrames(loaded.video, [0], { ...opts, chromaKey: true }))[0]; items.push(native);
      ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(native.bitmap, 0, 0);
      const actual = ctx.getImageData(0, 0, c.width, c.height).data;
      const expectedData = expected.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      assert(actual.every((v, i) => v === expectedData[i]), '视频与原图去背不一致');
      for (const pixelated of [false, true]) {
        const targetHeight = Math.max(1, Math.floor(loaded.info.height / 3));
        const small = (await extractFrames(loaded.video, [0], { ...opts, chromaKey: true, targetHeight, pixelated }))[0]; items.push(small);
        const ref = document.createElement('canvas'); ref.width = small.bitmap.width; ref.height = targetHeight;
        const rc = ref.getContext('2d');
        rc.imageSmoothingEnabled = !pixelated; rc.imageSmoothingQuality = 'high';
        rc.drawImage(expected, 0, 0, ref.width, ref.height);
        const expectedSmall = rc.getImageData(0, 0, ref.width, ref.height).data;
        rc.clearRect(0, 0, ref.width, ref.height); rc.drawImage(small.bitmap, 0, 0);
        const actualSmall = rc.getImageData(0, 0, ref.width, ref.height).data;
        let maxColorError = 0;
        let maxAlphaError = 0;
        for (let i = 0; i < actualSmall.length; i += 4) {
          maxAlphaError = Math.max(maxAlphaError, Math.abs(actualSmall[i + 3] - expectedSmall[i + 3]));
          for (let c = 0; c < 3; c++) {
            maxColorError = Math.max(maxColorError, Math.abs(actualSmall[i + c] * actualSmall[i + 3] - expectedSmall[i + c] * expectedSmall[i + 3]) / 255);
          }
        }
        // Canvas/ImageBitmap 往返允许一级预乘颜色量化误差，alpha 必须逐像素一致。
        assert(maxColorError <= 1 && maxAlphaError === 0, `未按先去背再缩放处理，pixelated=${pixelated}, maxColorError=${maxColorError}, maxAlphaError=${maxAlphaError}`);
      }
      return `视频首帧/原尺寸 ${loaded.info.width}×${loaded.info.height}/原图去背/两种后缩放模式`;
    } finally {
      items.forEach(item => item.bitmap.close());
      releaseVideo(loaded);
    }
  });
  passed.push(videoChecks);
  await page.locator('input[type=file][accept^=video]').setInputFiles('h:/GameDevTools/mockup/test-run.mp4');
  await page.getByRole('button', { name: '抽取并导入' }).waitFor();
  await page.getByLabel('输出高度', { exact: true }).waitFor();
  assert(await page.getByLabel('输出高度', { exact: true }).inputValue() === '0', '视频未默认原尺寸');
  assert(await page.getByLabel('边缘去色污染', { exact: true }).inputValue() === '100', '视频去色污染默认值错误');
  await page.getByLabel('输出高度', { exact: true }).fill('100');
  await page.getByLabel('缩放方式', { exact: true }).selectOption('pixelated');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  passed.push('视频导入画质设置');
  return { passed };
}
