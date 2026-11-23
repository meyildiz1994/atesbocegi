import { Canvas } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { AUDIO, CRYSTAL, DEV, FOG, FX, JAR, RING, SIM, SPIRIT, START, UI, WIND, ZONES } from '../config/balance';
import {
  countByStatus,
  createSimState,
  seedFireflies,
  stepSimulation,
  STATUS_DEAD,
  STATUS_FREE,
  MAX_PULSES,
  spawnWindGust,
  type SimState,
} from '../game/simulation';
import { emitCatch, emitGust, emitPop, pulseQueue, zoneLive } from '../game/zoneBus';
import { skyEffects } from '../game/constellations';
import { moonRules } from '../game/moonCycle';
import { containerOf, crystalWeights, fogBand, fogRingScale, windGustIndex } from '../game/zoneMechanics';
import { comboPitch } from '../game/combo';
import { registerCatch } from '../game/comboFeed';
import { selectBrightness, useGame, useStats } from '../game/state';
import { skinColor } from '../game/store';
import { tutorialFireflyCap } from '../game/tutorial';
import { t } from '../i18n';
import { collectSoundId, playSfx } from '../services/audio';
import { hapticCollect, hapticJarEmpty } from '../services/haptics';
import { Backdrop } from './Backdrop';
import { ZoneArt } from './ZoneArt';
import { Fireflies } from './Fireflies';
import { CollectRing } from './Glow';
import { Jar } from './Jar';
import { JarBurst } from './JarBurst';
import { Spirits } from './Spirits';
import { Trails } from './Trails';
import { FogLayer, WindStreaks } from './ZoneLayers';

type Props = {
  /** Kavanoz boşaltılınca kazanılan Işık ile çağrılır (uçan sayı için). */
  onLightGained?: (amount: number, x: number, y: number) => void;
};

const CW0 = crystalWeights(0);
const CW1 = crystalWeights(1);
const CW2 = crystalWeights(2);

function hexToRgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Oyun sahnesi: Skia çizimi + UI thread'de çalışan oyun döngüsü + sürükleme.
 * Her karede React state güncellenmez; HUD'a saniyede en fazla UI.hudUpdatesPerSecond kez veri gider.
 */
export function ForestCanvas({ onLightGained }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const jarX = width / 2;
  const jarY = height - insets.bottom - JAR.bottomOffset;

  const [initialSim] = useState(() => createSimState(SIM.capacity, Date.now() % 100000));
  const sim = useSharedValue<SimState>(initialSim);
  const simTime = useSharedValue(0);
  const seeded = useSharedValue(false);

  const dims = useSharedValue({ width, height, jarX, jarY });
  useEffect(() => {
    dims.value = { width, height, jarX, jarY };
  }, [dims, width, height, jarX, jarY]);

  // Oyun parametreleri: yükseltme/yetenek/bölgeden hesaplanan statlar.
  const stats = useStats();
  const tutorialStep = useGame((s) => s.tutorialStep);
  const stress = useGame((s) => s.stressFireflies);
  const effectiveMax = Math.min(stress > 0 ? stress : tutorialFireflyCap(tutorialStep, stats.maxFireflies), SIM.capacity);
  const ringRadius = useSharedValue<number>(START.ringRadius);
  const jarCapacity = useSharedValue<number>(START.jarCapacity);
  // İlk değer de onboarding sınırına uyar: ilk karede tohumlanan böcek sayısı buna göre.
  const maxFireflies = useSharedValue<number>(effectiveMax);
  const drawCount = FX.drawBuckets.find((b) => b >= effectiveMax * FX.drawHeadroom) ?? SIM.capacity;
  const spawnRate = useSharedValue<number>(START.spawnRate);
  const spirits = useSharedValue(0);
  const spiritSpeed = useSharedValue<number>(SPIRIT.speed);
  const magnetRange = useSharedValue(0);
  const magnetPull = useSharedValue(0);
  const autoEmpty = useSharedValue(false);
  const jarCount = useSharedValue(0);
  /** Boşaltma patlaması: 0'dan 1'e akar (boştayken 1); gücü boşaltılan doluluk. */
  const burst = useSharedValue(1);
  const burstPower = useSharedValue(0);
  // Isınma: açılışta patlama neredeyse görünmez biçimde bir kez çizilir; gölgelendiriciler
  // derlenmiş olur ve ilk gerçek boşaltmada takılma yaşanmaz.
  useEffect(() => {
    scheduleOnUI(() => {
      'worklet';
      burst.value = 0.97;
      burst.value = withTiming(1, { duration: 400 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Bölge mekanikleri: bölge, bölgeye giriş anı (sim zamanı), sisteki halka ölçeği, son rüzgâr.
  const zoneIdx = useSharedValue(0);
  const zoneT0 = useSharedValue(0);
  const fogScale = useSharedValue(1);
  const lastGust = useSharedValue(-1);
  // Ay Döngüsü kuralları: böcek hızı, doğma ve sis/rüzgâr sıklığı.
  const moonCycle = useGame((s) => s.moonCycle);
  // Rüzgâr Çobanı takımyıldızı: rüzgâr her bölgede eser.
  const windEverywhere = useGame((s) => skyEffects(s.sky).windEverywhere);
  const windAll = useSharedValue(windEverywhere);
  useEffect(() => {
    windAll.value = windEverywhere;
  }, [windAll, windEverywhere]);
  const moon = useSharedValue(moonRules(moonCycle));
  useEffect(() => {
    moon.value = moonRules(moonCycle);
  }, [moon, moonCycle]);
  const lanternLevel = useGame((s) => s.garden.lantern);
  const fogImmune = useGame((s) => containerOf(s.container).fogImmune);
  useEffect(() => {
    fogScale.value = fogRingScale(lanternLevel, fogImmune);
  }, [fogScale, lanternLevel, fogImmune]);
  useEffect(() => {
    ringRadius.value = withTiming(stats.ringRadius, { duration: 300 });
    jarCapacity.value = stats.jarCapacity;
    maxFireflies.value = effectiveMax;
    spawnRate.value = stress > 0 ? DEV.stressSpawnRate : stats.spawnRate;
    spirits.value = stats.spirits;
    spiritSpeed.value = stats.spiritSpeed;
    magnetRange.value = stats.magnetRange;
    magnetPull.value = stats.magnetPull;
    autoEmpty.value = stats.autoEmpty;
  }, [stats, effectiveMax, stress, ringRadius, jarCapacity, maxFireflies, spawnRate, spirits, spiritSpeed, magnetRange, magnetPull, autoEmpty]);

  // Bölge değişince kavanozdakiler o bölgenin değeriyle sayılmasın diye kavanoz boşalır (store da sıfırlar).
  // Yeni bölgeye geçince orman bir anda böcekle dolar ("vay be" anı).
  const zoneForJar = useGame((s) => s.zoneIndex);
  const [firstZone] = useState(zoneForJar);
  useEffect(() => {
    jarCount.set(0);
    zoneIdx.value = zoneForJar;
    scheduleOnUI(() => {
      'worklet';
      zoneT0.value = sim.value.time;
      lastGust.value = -1;
    });
    if (zoneForJar === firstZone) return;
    scheduleOnUI(() => {
      'worklet';
      const d = dims.value;
      sim.modify((st) => {
        'worklet';
        seedFireflies(st, maxFireflies.value - countByStatus(st, STATUS_FREE), d.width, d.height);
        return st;
      }, true);
    });
  }, [zoneForJar, firstZone, jarCount, dims, sim, maxFireflies, zoneIdx, zoneT0, lastGust]);

  // Şafak'ta sahne sıfırlanır.
  const dawnCounter = useGame((s) => s.dawnCounter);
  useEffect(() => {
    if (dawnCounter === 0) return;
    jarCount.set(0);
    scheduleOnUI(() => {
      'worklet';
      sim.modify((st) => {
        'worklet';
        for (let i = 0; i < st.capacity; i++) st.status[i] = STATUS_DEAD;
        st.spiritCount = 0;
        return st;
      }, true);
      seeded.value = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dawnCounter]);

  const zoneIndex = useGame((s) => s.zoneIndex);
  // Kostüm seçiliyse böcek rengi onun rengi, yoksa bölgenin.
  const skin = useGame((s) => skinColor(s.skin));
  const fireflyHex = skin ?? (ZONES[zoneIndex] ?? ZONES[0]).fireflyColor;
  const tint = useSharedValue(hexToRgb01(fireflyHex));
  useEffect(() => {
    tint.value = hexToRgb01(fireflyHex);
  }, [tint, fireflyHex]);

  const brightnessTarget = useGame(selectBrightness);
  const brightness = useSharedValue(0);
  useEffect(() => {
    brightness.value = withTiming(brightnessTarget, { duration: 1200 });
  }, [brightness, brightnessTarget]);

  // Parmak
  const fingerActive = useSharedValue(false);
  const fingerX = useSharedValue(-1000);
  const fingerY = useSharedValue(-1000);
  const ringVisibility = useSharedValue(0);

  const pan = usePanGesture({
    minDistance: 0,
    onBegin: (e) => {
      'worklet';
      fingerActive.value = true;
      fingerX.value = e.x;
      fingerY.value = e.y;
      ringVisibility.value = 1;
    },
    onUpdate: (e) => {
      'worklet';
      fingerX.value = e.x;
      fingerY.value = e.y;
    },
    onFinalize: () => {
      'worklet';
      fingerActive.value = false;
      ringVisibility.value = withTiming(0, { duration: RING.fadeOutTime * 1000 });
    },
  });

  const setLiveStats = useGame((s) => s.setLiveStats);
  const hudInterval = 1 / UI.hudUpdatesPerSecond;
  const hudAcc = useSharedValue(0);

  const onJarEmptied = (n: number) => {
    const gain = useGame.getState().emptyJar(n);
    if (gain > 0) {
      hapticJarEmpty();
      playSfx('sfx_jar_empty');
      onLightGained?.(gain, jarX, jarY - JAR.height / 2);
    }
  };

  const startBurst = (n: number) => {
    'worklet';
    burstPower.value = Math.min(1, n / Math.max(1, jarCapacity.value));
    burst.set(0);
    burst.set(withTiming(1, { duration: JAR.burstDuration * 1000 }));
  };

  const loop = useFrameCallback((info) => {
    'worklet';
    const dt = (info.timeSincePreviousFrame ?? 16) / 1000;
    const d = dims.value;
    const live = zoneLive.value;
    const zi = zoneIdx.value;
    const mr = moon.value;
    let spawnMul = live.spawnMult * mr.spawn;
    let gust = -1;
    sim.modify((s) => {
      'worklet';
      if (!seeded.value) {
        seedFireflies(s, Math.max(1, Math.round(maxFireflies.value * SIM.initialSeedShare)), d.width, d.height);
        seeded.value = true;
      }
      const zt = (s.time - zoneT0.value) * mr.events;
      s.speedMult = mr.speed;
      // Sisli Bataklık: sis bandı ve sisle gelen böcekler.
      if (zi === FOG.zoneIndex) {
        const band = fogBand(zt, d.width);
        s.fogL = band[0];
        s.fogR = band[1];
        if (band[1] > band[0]) spawnMul *= FOG.spawnMult;
      } else {
        s.fogL = 0;
        s.fogR = 0;
      }
      // Gök Kanyonu: rüzgârla gelen nadir böcekler.
      if (zi === WIND.zoneIndex || windAll.value) {
        const gi = windGustIndex(zt);
        if (gi > lastGust.value) {
          lastGust.value = gi;
          spawnWindGust(s, WIND.count, d.width, d.height);
          gust = gi;
        }
      }
      // Mantar patlamaları.
      const q = pulseQueue.value;
      if (q.length > 0) {
        let n = 0;
        for (let k = 0; k + 2 < q.length && n < MAX_PULSES; k += 3) {
          s.pulseX[n] = q[k]!;
          s.pulseY[n] = q[k + 1]!;
          s.pulseR[n] = q[k + 2]!;
          n++;
        }
        s.pulseN = n;
        pulseQueue.value = [];
      }
      stepSimulation(s, dt, {
        width: d.width,
        height: d.height,
        maxFireflies: maxFireflies.value,
        spawnRate: spawnRate.value * spawnMul,
        fogRingScale: fogScale.value,
        crystalShare: zi === CRYSTAL.zoneIndex ? CRYSTAL.coloredShare : 0,
        crystalWeights: live.scarce === 0 ? CW0 : live.scarce === 1 ? CW1 : CW2,
        gatherOn: live.gatherOn,
        gatherX: live.gatherX,
        gatherY: live.gatherY,
        ringRadius: ringRadius.value,
        jarCapacity: jarCapacity.value,
        jarCount: jarCount.value,
        jarX: d.jarX,
        jarY: d.jarY,
        fingerActive: fingerActive.value,
        fingerX: fingerX.value,
        fingerY: fingerY.value,
        spirits: spirits.value,
        spiritSpeed: spiritSpeed.value,
        magnetRange: magnetRange.value,
        magnetPull: magnetPull.value,
      });
      return s;
    }, true);
    const st = sim.value;
    simTime.value = st.time;
    const arrivedNow = st.lastArrived;
    const caughtNow = st.lastCaught;

    if (arrivedNow > 0) {
      jarCount.set(Math.min(jarCapacity.value, jarCount.value + arrivedNow));
      // Otomatik Boşaltma: kavanoz dolunca kendiliğinden boşalır.
      if (autoEmpty.value && jarCount.value >= jarCapacity.value) {
        const n = jarCount.value;
        jarCount.set(0);
        startBurst(n);
        scheduleOnRN(onJarEmptied, n);
      }
    }
    if (caughtNow > 0) {
      scheduleOnRN(onCaught, caughtNow);
      const ck = st.caughtKind;
      scheduleOnRN(emitCatch, caughtNow, [ck[0]!, ck[1]!, ck[2]!, ck[3]!, ck[4]!]);
    }
    if (gust >= 0) scheduleOnRN(emitGust, gust);
    if (st.lastPopped > 0) scheduleOnRN(emitPop, st.lastPopped);

    hudAcc.value += dt;
    if (hudAcc.value >= hudInterval) {
      hudAcc.value = 0;
      scheduleOnRN(setLiveStats, jarCount.value, countByStatus(sim.value, STATUS_FREE));
    }
  });

  // Arka plana geçince döngüyü durdur.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      loop.setActive(state === 'active');
    });
    return () => sub.remove();
  }, [loop]);

  const emptyJar = () => {
    scheduleOnUI(() => {
      'worklet';
      const n = jarCount.value;
      if (n <= 0) return;
      jarCount.set(0);
      startBurst(n);
      scheduleOnRN(onJarEmptied, n);
    });
  };

  const jarCountRo = useDerivedValue(() => jarCount.value);
  const capacityRo = useDerivedValue(() => jarCapacity.value);

  const hudJar = useGame((s) => s.jarCount);

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            <ZoneArt
              zoneIndex={zoneIndex}
              width={width}
              height={height}
              brightness={brightness}
              fallback={
                <Backdrop
                  width={width}
                  height={height}
                  brightness={brightness}
                  skyTop={(ZONES[zoneIndex] ?? ZONES[0]).bgTop}
                  skyLitTop={(ZONES[zoneIndex] ?? ZONES[0]).bgLitTop}
                />
              }
            />
            {effectiveMax <= FX.haloMaxFireflies ? (
              <Fireflies key={`h${drawCount}`} sim={sim} tint={tint} layer="halo" count={drawCount} />
            ) : null}
            <Trails sim={sim} tint={tint} />
            <Fireflies key={`c${drawCount}`} sim={sim} tint={tint} count={drawCount} />
            {zoneIndex === WIND.zoneIndex || windEverywhere ? <WindStreaks sim={sim} /> : null}
            <Spirits sim={sim} />
            {zoneIndex === FOG.zoneIndex ? <FogLayer sim={sim} height={height} /> : null}
            <CollectRing x={fingerX} y={fingerY} radius={ringRadius} visibility={ringVisibility} />
            <Jar x={jarX} y={jarY} count={jarCountRo} capacity={capacityRo} time={simTime} burst={burst} />
            <JarBurst x={jarX} y={jarY} progress={burst} power={burstPower} />
          </Canvas>
        </View>
      </GestureDetector>
      <Pressable
        onPress={emptyJar}
        accessibilityRole="button"
        accessibilityLabel={t('a11y.jar', { count: hudJar, capacity: stats.jarCapacity })}
        hitSlop={12}
        style={{
          position: 'absolute',
          left: jarX - JAR.width / 2 - 8,
          top: jarY - JAR.height / 2 - 8,
          width: JAR.width + 16,
          height: JAR.height + 16,
        }}
      />
    </View>
  );
}

function onCaught(n: number) {
  const combo = registerCatch(n);
  const pitch = comboPitch(combo);
  for (let i = 0; i < Math.min(n, AUDIO.maxCollectSoundsPerCatch); i++) playSfx(collectSoundId(), { pitch });
  hapticCollect();
}
