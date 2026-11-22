/**
 * Mağaza ekran görüntüleri: web derlemesini (npm run web:export → dist) yerel sunucuda açar,
 * her sahne için hazır bir kayıt yükler ve oyun ekranını yakalar; sonra başlıklı çerçeveye koyar.
 *
 *   node scripts/store/capture.js <web-url> <çıktı-klasörü>
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [, , URL = 'http://localhost:8765/', OUT = 'store/screenshots'] = process.argv;

const DEVICES = {
  'iphone-6.7': { vw: 430, vh: 932, scale: 3, out: [1290, 2796] },
  'ipad-13': { vw: 1032, vh: 1376, scale: 2, out: [2064, 2752] },
  'android-phone': { vw: 360, vh: 640, scale: 3, out: [1080, 1920] },
};

const CAPTIONS = {
  en: [
    'One firefly. One dark forest.',
    'Grow your ring, jar and glow',
    'Turn the night into a sea of light',
    'Discover glowing new worlds',
    'Relax. Your spirits keep gathering',
  ],
  tr: [
    'Bir ateşböceği. Karanlık bir orman.',
    'Halkanı, kavanozunu, ışığını büyüt',
    'Geceyi ışık denizine çevir',
    'Parlayan yeni dünyalar keşfet',
    'Rahatla, ruhların toplamaya devam etsin',
  ],
};

const base = (now) => ({
  saveVersion: 3, light: 0, runLight: 0, lifetimeLight: 0, zoneLight: [0, 0, 0, 0, 0], zoneIndex: 0,
  levels: { ring: 0, jar: 0, bright: 0, crowd: 0, spirit: 0, autoEmpty: 0, magnet: 0 },
  skills: {}, stardust: 0, stardustEarned: 0, prestigeCount: 0,
  settings: { sound: false, music: false, haptics: false, language: 'system' },
  lastSeen: now, playTimeSec: 0, firstLaunchAt: now, tutorialStep: 0, offlineReport: null,
  boostUntil: 0, lastInterstitialAt: 0, purchases: { removeAds: true, starter: false },
});

const SCENES = [
  { name: '1-dark', save: {} , wait: 3500 },
  {
    name: '2-upgrades',
    save: { light: 1840, runLight: 2600, lifetimeLight: 2600, zoneLight: [2600, 0, 0, 0, 0], tutorialStep: 5,
      levels: { ring: 4, jar: 3, bright: 2, crowd: 2, spirit: 1, autoEmpty: 0, magnet: 0 } },
    panel: /^(Upgrades|Yükseltmeler)$/, wait: 5000,
  },
  {
    name: '3-sea',
    save: { light: 48200, runLight: 160000, lifetimeLight: 160000, zoneLight: [1e6, 1e8, 0, 0, 0], zoneIndex: 1, tutorialStep: 5,
      levels: { ring: 11, jar: 14, bright: 8, crowd: 45, spirit: 6, autoEmpty: 1, magnet: 3 } },
    drag: true, wait: 6000,
  },
  {
    name: '4-mushroom',
    save: { light: 3.2e6, runLight: 4.1e6, lifetimeLight: 4.1e6, zoneLight: [1e6, 1e8, 3e8, 0, 0], zoneIndex: 2, tutorialStep: 5,
      levels: { ring: 11, jar: 20, bright: 12, crowd: 30, spirit: 9, autoEmpty: 1, magnet: 4 } },
    drag: true, wait: 6000,
  },
  {
    name: '5-crystal',
    save: { light: 2.6e8, runLight: 2.6e8, lifetimeLight: 2.6e8, zoneLight: [1e6, 1e8, 3e8, 4e10, 0], zoneIndex: 3, tutorialStep: 5,
      levels: { ring: 11, jar: 22, bright: 16, crowd: 36, spirit: 16, autoEmpty: 1, magnet: 5 } },
    wait: 7000,
  },
];

async function captureRaw(browser, device, lang, scene) {
  const d = DEVICES[device];
  const ctx = await browser.newContext({
    viewport: { width: d.vw, height: d.vh }, deviceScaleFactor: d.scale, locale: lang === 'tr' ? 'tr-TR' : 'en-US',
  });
  const now = Date.now();
  const save = { ...base(now), ...scene.save };
  await ctx.addInitScript((s) => {
    localStorage.clear();
    localStorage.setItem('atesbocegi\\atesbocegi.save', JSON.stringify(s));
  }, save);
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(scene.wait);
  if (scene.panel) {
    await p.getByText(scene.panel).first().click();
    await p.waitForTimeout(900);
  }
  if (scene.drag) {
    await p.mouse.move(d.vw * 0.3, d.vh * 0.45);
    await p.mouse.down();
    for (let i = 0; i <= 20; i++) {
      await p.mouse.move(d.vw * (0.3 + 0.4 * (i / 20)), d.vh * (0.45 - 0.08 * Math.sin((i / 20) * Math.PI)));
      await p.waitForTimeout(25);
    }
  }
  const buf = await p.screenshot();
  if (scene.drag) await p.mouse.up();
  await ctx.close();
  return buf;
}

async function compose(browser, device, caption, rawPng) {
  const d = DEVICES[device];
  const [W, H] = d.out;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const capH = Math.round(H * 0.17);
  const pad = Math.round(W * 0.07);
  const shotH = H - capH - pad;
  const shotW = Math.round((shotH * d.vw) / d.vh);
  const font = Math.round(W * (device === 'ipad-13' ? 0.045 : 0.068));
  await p.setContent(`<!DOCTYPE html><html><body style="margin:0;width:${W}px;height:${H}px;overflow:hidden;
    background:radial-gradient(ellipse at 50% 0%, #1d3a4a 0%, #0a1020 45%, #05070d 100%);font-family:Inter, sans-serif;">
    <div style="height:${capH}px;display:flex;align-items:center;justify-content:center;padding:0 ${pad}px;box-sizing:border-box;">
      <div style="color:#f4ffb0;font-weight:800;font-size:${font}px;line-height:1.15;text-align:center;letter-spacing:-0.5px;
        text-shadow:0 0 ${font * 0.6}px rgba(216,255,106,.55);">${caption}</div></div>
    <div style="display:flex;justify-content:center;">
      <img src="data:image/png;base64,${rawPng.toString('base64')}" style="width:${shotW}px;height:${shotH}px;
        border-radius:${Math.round(W * 0.05)}px;border:${Math.max(3, Math.round(W * 0.004))}px solid rgba(216,255,106,.35);
        box-shadow:0 0 ${Math.round(W * 0.06)}px rgba(216,255,106,.25);object-fit:cover;"></div>
  </body></html>`);
  await p.waitForTimeout(150);
  const buf = await p.screenshot({ type: 'png' });
  await ctx.close();
  return buf;
}

(async () => {
  const browser = await chromium.launch();
  const only = process.env.ONLY_DEVICE;
  for (const device of Object.keys(DEVICES)) {
    if (only && only !== device) continue;
    for (const lang of ['en', 'tr']) {
      const dir = path.join(OUT, lang, device);
      fs.mkdirSync(dir, { recursive: true });
      fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true });
      for (let i = 0; i < SCENES.length; i++) {
        const raw = await captureRaw(browser, device, lang, SCENES[i]);
        fs.writeFileSync(path.join(OUT, 'raw', `${lang}-${device}-${SCENES[i].name}.png`), raw, { flag: 'w' });
        const framed = await compose(browser, device, CAPTIONS[lang][i], raw);
        fs.writeFileSync(path.join(dir, `${SCENES[i].name}.png`), framed);
        console.log(lang, device, SCENES[i].name);
      }
    }
  }
  await browser.close();
})();
