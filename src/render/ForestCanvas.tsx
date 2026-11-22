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

import { JAR, RING, SIM, SPIRIT, START, UI, ZONES } from '../config/balance';
import {
  countByStatus,
  createSimState,
  seedFireflies,
  stepSimulation,
  STATUS_DEAD,
  STATUS_FREE,
  type SimState,
} from '../game/simulation';
import { selectBrightness, useGame, useStats } from '../game/state';
import { tutorialFireflyCap } from '../game/tutorial';
import { t } from '../i18n';
import { collectSoundId, playSfx } from '../services/audio';
import { hapticCollect, hapticJarEmpty } from '../services/haptics';
import { Backdrop } from './Backdrop';
import { Fireflies } from './Fireflies';
import { CollectRing } from './Glow';
import { Jar } from './Jar';
import { Spirits } from './Spirits';

type Props = {
  /** Kavanoz boşaltılınca kazanılan Işık ile çağrılır (uçan sayı için). */
  onLightGained?: (amount: number, x: number, y: number) => void;
};

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
  const ringRadius = useSharedValue<number>(START.ringRadius);
  const jarCapacity = useSharedValue<number>(START.jarCapacity);
  // İlk değer de onboarding sınırına uyar: ilk karede tohumlanan böcek sayısı buna göre.
  const maxFireflies = useSharedValue<number>(Math.min(tutorialFireflyCap(tutorialStep, stats.maxFireflies), SIM.capacity));
  const spawnRate = useSharedValue<number>(START.spawnRate);
  const spirits = useSharedValue(0);
  const spiritSpeed = useSharedValue<number>(SPIRIT.speed);
  const magnetRange = useSharedValue(0);
  const magnetPull = useSharedValue(0);
  const autoEmpty = useSharedValue(false);
  const jarCount = useSharedValue(0);
  useEffect(() => {
    ringRadius.value = withTiming(stats.ringRadius, { duration: 300 });
    jarCapacity.value = stats.jarCapacity;
    maxFireflies.value = Math.min(tutorialFireflyCap(tutorialStep, stats.maxFireflies), SIM.capacity);
    spawnRate.value = stats.spawnRate;
    spirits.value = stats.spirits;
    spiritSpeed.value = stats.spiritSpeed;
    magnetRange.value = stats.magnetRange;
    magnetPull.value = stats.magnetPull;
    autoEmpty.value = stats.autoEmpty;
  }, [stats, tutorialStep, ringRadius, jarCapacity, maxFireflies, spawnRate, spirits, spiritSpeed, magnetRange, magnetPull, autoEmpty]);

  // Bölge değişince kavanozdakiler o bölgenin değeriyle sayılmasın diye kavanoz boşalır (store da sıfırlar).
  const zoneForJar = useGame((s) => s.zoneIndex);
  useEffect(() => {
    jarCount.set(0);
  }, [zoneForJar, jarCount]);

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
  const tint = useSharedValue(hexToRgb01((ZONES[zoneIndex] ?? ZONES[0]).fireflyColor));
  useEffect(() => {
    tint.value = hexToRgb01((ZONES[zoneIndex] ?? ZONES[0]).fireflyColor);
  }, [tint, zoneIndex]);

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

  const loop = useFrameCallback((info) => {
    'worklet';
    const dt = (info.timeSincePreviousFrame ?? 16) / 1000;
    const d = dims.value;
    sim.modify((s) => {
      'worklet';
      if (!seeded.value) {
        seedFireflies(s, Math.max(1, Math.round(maxFireflies.value / 3)), d.width, d.height);
        seeded.value = true;
      }
      stepSimulation(s, dt, {
        width: d.width,
        height: d.height,
        maxFireflies: maxFireflies.value,
        spawnRate: spawnRate.value,
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
        scheduleOnRN(onJarEmptied, n);
      }
    }
    if (caughtNow > 0) scheduleOnRN(onCaught, caughtNow);

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
            <Backdrop
              width={width}
              height={height}
              brightness={brightness}
              skyTop={(ZONES[zoneIndex] ?? ZONES[0]).bgTop}
              skyLitTop={(ZONES[zoneIndex] ?? ZONES[0]).bgLitTop}
            />
            <Fireflies sim={sim} tint={tint} />
            <Spirits sim={sim} />
            <CollectRing x={fingerX} y={fingerY} radius={ringRadius} visibility={ringVisibility} />
            <Jar x={jarX} y={jarY} count={jarCountRo} capacity={capacityRo} time={simTime} />
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
  for (let i = 0; i < Math.min(n, 3); i++) playSfx(collectSoundId());
  hapticCollect();
}
