/**
 * Başsız denge simülasyonu.
 *
 * Gerçek oyun kodunu (simulation.ts + economy.ts + state.ts) çizim olmadan çalıştırır.
 * Sanal oyuncu parmağını en yakın ateşböceğine doğru sürükler, kavanoz dolunca kısa bir
 * gecikmeyle boşaltır, maliyetine göre en verimli yükseltmeyi alır ve açılan en yüksek bölgeye geçer.
 *
 * Çalıştırma:  npm run simulate            (varsayılan 300 dk)
 *              npm run simulate -- 20       (ilk 20 dk)
 */
import { BALANCE_TARGETS, BOT, UPGRADE_ORDER, ZONES, type UpgradeId } from '../src/config/balance';
import {
  canPrestige,
  levelsLeft,
  spiritLightPerSecond,
  stardustForPrestige,
  unlockedZoneCount,
  upgradeCost,
  type Stats,
} from '../src/game/economy';
import { formatNumber } from '../src/game/numbers';
import { createSimState, STATUS_FREE, stepSimulation } from '../src/game/simulation';
import { statsOf, useGame } from '../src/game/state';
import { advanceTutorial, TUTORIAL_STEP, tutorialFireflyCap } from '../src/game/tutorial';

import * as BALANCE from '../src/config/balance';

/**
 * Ayar denemesi için: BALANCE_OVERRIDES='{"UPGRADES":{"bright":{"growth":1.5}}}' gibi bir JSON
 * balance.ts değerlerinin üzerine yazılır (yalnızca bu çalıştırmada).
 */
function deepAssign(target: Record<string, unknown>, src: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(src)) {
    const cur = target[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object') {
      deepAssign(cur as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      target[k] = v;
    }
  }
}
if (process.env.BALANCE_OVERRIDES) {
  deepAssign(BALANCE as unknown as Record<string, unknown>, JSON.parse(process.env.BALANCE_OVERRIDES) as Record<string, unknown>);
}
const QUIET = process.env.SIM_QUIET === '1';

const minutes = Number(process.argv[2] ?? BOT.defaultMinutes);
const DT = BOT.dt;
const W = BOT.screenWidth;
const H = BOT.screenHeight;
const JAR_X = W / 2;
const JAR_Y = H - BOT.jarFromBottom;

/**
 * Botun satın alma kararı için kaba Işık/sn tahmini: toplama doğma hızıyla sınırlı,
 * küçük halka ve kavanoz boşaltma beklemesi verimi düşürür.
 */
function estimateRate(st: Stats): number {
  const reach = Math.min(1, (st.ringRadius + st.magnetRange * BOT.magnetWeight) / BOT.ringForFullCatch);
  const catchRate = st.spawnRate * reach;
  const fillTime = st.jarCapacity / Math.max(catchRate, 1e-6);
  const jarEff = st.autoEmpty ? 1 : fillTime / (fillTime + BOT.tapDelay + BOT.tapDelay);
  const crowdBonus = 1 + st.maxFireflies / BOT.crowdBonusDivisor;
  return (catchRate * jarEff * crowdBonus + spiritLightPerSecond(st) / st.valuePerFirefly) * st.valuePerFirefly;
}

const store = useGame;
store.getState().resetProgress(0);
const sim = createSimState();

const events: { t: number; what: string }[] = [];
const log = (t: number, what: string) => events.push({ t, what });
const firstBuy = new Set<UpgradeId>();
const milestones = new Map<string, number>();
const mark = (t: number, label: string) => {
  if (!milestones.has(label)) milestones.set(label, t);
};
let zonesSeen = 1;
let prestigeLogged = false;
let tutorialStep: number = TUTORIAL_STEP.drag;

let jarCount = 0;
let fullSince = -1;
let fingerX = W / 2;
let fingerY = H / 2;
let nextDecision = 0;

const fmtTime = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return m >= 60 ? `${Math.floor(m / 60)}s ${String(m % 60).padStart(2, '0')}dk` : `${m}:${String(s).padStart(2, '0')}`;
};

for (let t = 0; t < minutes * 60 && !milestones.has('İlk Şafak'); t += DT) {
  const s = store.getState();
  const st = statsOf(s);

  // Onboarding (oyundaki kuralların aynısı).
  const anyOwned = UPGRADE_ORDER.some((id) => s.levels[id] > 0);
  const anyAffordable = UPGRADE_ORDER.some((id) => levelsLeft(id, s.levels[id]) > 0 && s.light >= upgradeCost(id, s.levels[id]));
  const nextStep = advanceTutorial(tutorialStep, {
    jarCount,
    jarCapacity: st.jarCapacity,
    lifetimeLight: s.lifetimeLight,
    prestigeCount: s.prestigeCount,
    anyUpgradeOwned: anyOwned,
    anyUpgradeAffordable: anyAffordable,
  });
  if (nextStep !== tutorialStep) {
    tutorialStep = nextStep;
    if (tutorialStep === TUTORIAL_STEP.upgrade) log(t, 'İlk yükseltme alınabilir');
  }

  // Parmak: en yakın serbest böceğe doğru.
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < sim.capacity; i++) {
    if (sim.status[i] !== STATUS_FREE) continue;
    const dx = (sim.x[i] ?? 0) - fingerX;
    const dy = (sim.y[i] ?? 0) - fingerY;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best >= 0) {
    const dx = (sim.x[best] ?? 0) - fingerX;
    const dy = (sim.y[best] ?? 0) - fingerY;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const step = Math.min(d, BOT.fingerSpeed * DT);
    fingerX += (dx / d) * step;
    fingerY += (dy / d) * step;
  }

  const r = stepSimulation(sim, DT, {
    width: W,
    height: H,
    maxFireflies: tutorialFireflyCap(tutorialStep, st.maxFireflies),
    spawnRate: st.spawnRate,
    ringRadius: st.ringRadius,
    jarCapacity: st.jarCapacity,
    jarCount,
    jarX: JAR_X,
    jarY: JAR_Y,
    fingerActive: true,
    fingerX,
    fingerY,
    spirits: st.spirits,
    spiritSpeed: st.spiritSpeed,
    magnetRange: st.magnetRange,
    magnetPull: st.magnetPull,
  });
  if (t === 0 || (r.caught > 0 && s.lifetimeLight === 0 && jarCount === 0)) {
    if (r.caught > 0) log(t, 'İlk toplama');
  }
  jarCount = Math.min(st.jarCapacity, jarCount + r.arrived);

  // Kavanoz boşaltma: otomatikse hemen, değilse oyuncu tepki süresiyle.
  if (jarCount >= st.jarCapacity) {
    if (st.autoEmpty) {
      store.getState().emptyJar(jarCount, t * 1000);
      jarCount = 0;
    } else {
      if (fullSince < 0) fullSince = t;
      if (t - fullSince >= BOT.tapDelay) {
        const first = s.lifetimeLight === 0;
        store.getState().emptyJar(jarCount, t * 1000);
        if (first) log(t, 'İlk Işık (kavanoz boşaldı)');
        jarCount = 0;
        fullSince = -1;
      }
    }
  }

  // Kararlar saniyede bir.
  if (t >= nextDecision) {
    nextDecision = t + BOT.decisionInterval;
    const g = store.getState();

    // Bölge
    const unlocked = unlockedZoneCount(g.runLight);
    if (unlocked > zonesSeen) {
      for (let z = zonesSeen; z < unlocked; z++) {
        const lv = UPGRADE_ORDER.map((id) => `${id[0]}${g.levels[id]}`).join(' ');
        log(t, `Bölge ${z + 1} açıldı  (~${formatNumber(estimateRate(statsOf(g)))}/sn, ${lv})`);
        mark(t, `Bölge ${z + 1}`);
      }
      zonesSeen = unlocked;
    }
    if (g.zoneIndex !== unlocked - 1) {
      g.setZone(unlocked - 1);
      jarCount = 0;
    }

    // Yükseltme: tahmini Işık/sn artışı / maliyet oranı en yüksek olanı al.
    for (let k = 0; k < BOT.maxBuysPerDecision; k++) {
      const cur = store.getState();
      const base = estimateRate(statsOf(cur));
      let pick: UpgradeId | null = null;
      let pickScore = 0;
      for (const id of UPGRADE_ORDER) {
        if (levelsLeft(id, cur.levels[id]) === 0) continue;
        const c = upgradeCost(id, cur.levels[id]);
        if (c > cur.light) continue;
        const after = estimateRate(statsOf({ ...cur, levels: { ...cur.levels, [id]: cur.levels[id] + 1 } }));
        const score = (after - base) / c;
        if (score > pickScore) {
          pick = id;
          pickScore = score;
        }
      }
      if (!pick) break;
      cur.setBuyMode(1);
      cur.buyUpgrade(pick);
      if (!firstBuy.has(pick)) {
        firstBuy.add(pick);
        log(t, `İlk ${pick}`);
      }
    }

    if (!prestigeLogged && canPrestige(store.getState().runLight)) {
      prestigeLogged = true;
      log(t, 'Şafak (prestij) açıldı');
    }
    // İlk Şafak: kazanılacak Yıldız Tozu BOT.prestigeAtDust'a ulaşınca.
    if (!milestones.has('İlk Şafak') && stardustForPrestige(store.getState().runLight) >= BOT.prestigeAtDust) {
      const dust = store.getState().prestige();
      log(t, `İlk Şafak: +${dust} Yıldız Tozu`);
      mark(t, 'İlk Şafak');
      zonesSeen = 1;
      jarCount = 0;
    }
  }
}

const end = store.getState();
const fmtMin = (t: number | undefined) => (t === undefined ? '—' : fmtTime(t));
console.log('\nHedefler (±%20 tolerans):');
console.log('Olay        Hedef         Sonuç      Durum');
for (const g of BALANCE_TARGETS) {
  const t = milestones.get(g.label);
  const m = t === undefined ? undefined : t / 60;
  const ok = m !== undefined && m >= g.min * 0.8 && m <= g.max * 1.2;
  const strict = m !== undefined && m >= g.min && m <= g.max;
  console.log(
    `${g.label.padEnd(10)}  ${`${g.min}–${g.max} dk`.padEnd(12)}  ${fmtMin(t).padEnd(9)}  ${strict ? 'hedefte' : ok ? '±%20 içinde' : 'DIŞINDA'}`,
  );
}
if (!QUIET) {
console.log(`\nAteşböceği denge simülasyonu: ${minutes} dk, dt=${DT}s\n`);
console.log('Zaman      Olay');
console.log('---------  ------------------------------');
for (const e of events) console.log(`${fmtTime(e.t).padEnd(9)}  ${e.what}`);
console.log('\nSon durum:');
console.log(`  Işık ${formatNumber(end.light)}, bu koşu ${formatNumber(end.runLight)}, bölge ${end.zoneIndex + 1}/${ZONES.length}`);
console.log(
  '  Seviyeler: ' + UPGRADE_ORDER.map((id) => `${id} ${end.levels[id]}`).join(', '),
);
}
