async page => {
  await page.goto('http://127.0.0.1:8765/index.html');
  const r = await page.evaluate(async () => {
    const out = {};
    try {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error('img onerror'));
        img.src = '/test-green.jpg';
      });
      out.img = { ok: true, w: img.naturalWidth, h: img.naturalHeight };
    } catch (e) {
      out.img = { ok: false, err: String(e) };
    }
    try {
      const blob = await (await fetch('/test-green.jpg')).blob();
      const bm = await createImageBitmap(blob);
      out.bitmap = { ok: true, w: bm.width, h: bm.height };
    } catch (e) {
      out.bitmap = { ok: false, err: String(e) };
    }
    return out;
  });
  return 'DECODE TEST: ' + JSON.stringify(r);
}
