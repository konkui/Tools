// 分析白描边像素的颜色特征：容差 90 洪泛后，贴着背景的前景像素离白色有多远
async page => {
  await page.goto('http://127.0.0.1:8765/index.html');
  const r = await page.evaluate(async () => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = '/test-outline.png'; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    const w = c.width, h = c.height, n = w * h;

    // 图片是否有透明通道
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 250) transparent++;

    // 四角取样背景色
    const bg = [255, 255, 255]; // 先看是否白底
    const corner = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const i = (y * w + x) * 4;
      corner.push([data[i], data[i + 1], data[i + 2]]);
    }
    const bgReal = corner.reduce((s, p) => [s[0] + p[0] / 64, s[1] + p[1] / 64, s[2] + p[2] / 64], [0, 0, 0]);

    const dist = (i, B) => {
      const o = i * 4;
      return Math.hypot(data[o] - B[0], data[o + 1] - B[1], data[o + 2] - B[2]);
    };

    // 容差 90 洪泛
    const tol = 90;
    const isBg = new Uint8Array(n);
    const queue = new Int32Array(n);
    let qh = 0, qt = 0;
    const tryPush = (i) => {
      if (!isBg[i] && data[i * 4 + 3] > 0 && dist(i, bgReal) <= tol) { isBg[i] = 1; queue[qt++] = i; }
    };
    for (let x = 0; x < w; x++) { tryPush(x); tryPush((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { tryPush(y * w); tryPush(y * w + w - 1); }
    while (qh < qt) {
      const i = queue[qh++];
      const x = i % w, y = (i / w) | 0;
      if (x > 0) tryPush(i - 1);
      if (x < w - 1) tryPush(i + 1);
      if (y > 0) tryPush(i - w);
      if (y < h - 1) tryPush(i + w);
    }

    // 描边环：前景中贴着背景的像素，统计 dist 分布
    const rimDists = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (isBg[i] || data[i * 4 + 3] === 0) continue;
      if (isBg[i - 1] || isBg[i + 1] || isBg[i - w] || isBg[i + w]) rimDists.push(Math.round(dist(i, bgReal)));
    }
    rimDists.sort((a, b) => a - b);
    const q = (p) => rimDists[Math.floor(rimDists.length * p)] ?? 0;
    // 描边像素中"亮且灰"（接近白/浅灰）的比例
    let brightNeutral = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (isBg[i] || data[i * 4 + 3] === 0) continue;
      if (!(isBg[i - 1] || isBg[i + 1] || isBg[i - w] || isBg[i + w])) continue;
      const o = i * 4;
      const mn = Math.min(data[o], data[o + 1], data[o + 2]);
      const mx = Math.max(data[o], data[o + 1], data[o + 2]);
      if (mn > 170 && mx - mn < 45) brightNeutral++;
    }
    return {
      size: [w, h], transparentPx: transparent,
      bgReal: bgReal.map(Math.round),
      rimCount: rimDists.length,
      distMedian: q(0.5), distP90: q(0.9), distMax: rimDists[rimDists.length - 1],
      brightNeutralRatio: rimDists.length ? (brightNeutral / rimDists.length).toFixed(2) : 0,
    };
  });
  return JSON.stringify(r);
}
