/**
 * Mağaza tanıtım videosu: web derlemesinde gerçek oynanışı kaydeder (karanlık koru → ışık denizi → mantar vadisi).
 * Çıktı ham .webm (443×960); ffmpeg ile mağaza boyutuna (886×1920, 30 fps, H.264) büyütülür.
 *
 *   node scripts/store/video.js <web-url> <çıktı-klasörü>
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [, , URL = 'http://localhost:8765/', OUT = 'store/video', LANG = 'en'] = process.argv;
const VW = 443;
const VH = 960;

function save(now) {
  return {
    saveVersion: 3, light: 52000, runLight: 4.1e6, lifetimeLight: 4.1e6, zoneLight: [2500, 4e4, 2e5, 0, 0], zoneIndex: 0,
    levels: { ring: 10, jar: 12, bright: 8, crowd: 15, spirit: 4, autoEmpty: 0, magnet: 3 },
    skills: {}, stardust: 0, stardustEarned: 0, prestigeCount: 0,
    settings: { sound: false, music: false, haptics: false, language: LANG },
    lastSeen: now, playTimeSec: 0, firstLaunchAt: now, tutorialStep: 5, offlineReport: null,
    boostUntil: 0, lastInterstitialAt: 0, purchases: { removeAds: true, starter: false },
  };
}

/** Halkayı yumuşak bir sekiz çizerek gezdirir. */
async function sweep(p, ms) {
  const start = Date.now();
  await p.mouse.move(VW * 0.5, VH * 0.45);
  await p.mouse.down();
  // Sürüklemeyi adım sayısıyla değil saatle sürdürür (yavaş ortamda da süre sabit kalır).
  while (Date.now() - start < ms) {
    const t = ((Date.now() - start) / 5000) * Math.PI * 2;
    await p.mouse.move(VW * (0.5 + 0.32 * Math.sin(t)), VH * (0.45 + 0.18 * Math.sin(2 * t)));
  }
  await p.mouse.up();
}

const jar = (p) => p.getByLabel(LANG === 'tr' ? /^Kavanoz/ : /^Jar,/).first();
const next = (p) => p.getByLabel(LANG === 'tr' ? 'Sonraki bölge' : 'Next zone').first();

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: VW, height: VH },
    recordVideo: { dir: OUT, size: { width: VW, height: VH } },
  });
  const now = Date.now();
  await ctx.addInitScript((s) => {
    localStorage.clear();
    localStorage.setItem('atesbocegi\\atesbocegi.save', JSON.stringify(s));
  }, save(now));
  const p = await ctx.newPage();
  const t0 = Date.now();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const startAt = (Date.now() - t0) / 1000;

  await sweep(p, 5000);
  await jar(p).click({ force: true });
  await p.waitForTimeout(1200);
  await next(p).click({ force: true });
  await p.waitForTimeout(1200);
  await sweep(p, 6000);
  await jar(p).click({ force: true });
  await p.waitForTimeout(1200);
  await p.getByText(LANG === 'tr' ? /^Yükseltmeler$/ : /^Upgrades$/).first().click({ force: true });
  await p.waitForTimeout(1200);
  await p.getByText(/^\d[\d.,]*K?$/).nth(1).click({ force: true }).catch(() => {});
  await p.waitForTimeout(1500);
  await p.getByLabel(LANG === 'tr' ? 'Kapat' : 'Close').last().click({ force: true }).catch(() => {});
  await p.waitForTimeout(1000);
  await next(p).click({ force: true });
  await p.waitForTimeout(1200);
  await sweep(p, 5000);
  await jar(p).click({ force: true });
  await p.waitForTimeout(1800);

  const video = p.video();
  await ctx.close();
  await browser.close();
  const raw = await video.path();
  const dest = path.join(OUT, `raw-${LANG}.webm`);
  fs.renameSync(raw, dest);
  fs.writeFileSync(path.join(OUT, `raw-${LANG}.start`), String(startAt));
  console.log(dest, 'start', startAt.toFixed(1));
})();
