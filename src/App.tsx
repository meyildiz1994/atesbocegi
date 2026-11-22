import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { COLORS } from './config/balance';
import { usePersistence } from './game/persistence';
import { useGame } from './game/state';
import { TUTORIAL_STEP } from './game/tutorial';
import { useGameEvents } from './game/useGameEvents';
import { useTutorialDriver } from './game/useTutorial';
import { useLanguage } from './i18n/useLanguage';
import { ForestCanvas } from './render/ForestCanvas';
import { initAds } from './services/ads';
import { initIap } from './services/iap';
import { BoostButton } from './ui/BoostButton';
import { ComboCounter } from './ui/ComboCounter';
import { BottomBar, type PanelId } from './ui/BottomBar';
import { DawnFlash } from './ui/DawnFlash';
import { DawnPanel } from './ui/DawnPanel';
import { EventsPanel } from './ui/EventsPanel';
import { FloatingNumbers, type FloatingNumbersHandle } from './ui/FloatingNumbers';
import { FpsOverlay } from './ui/FpsOverlay';
import { GoldenFirefly } from './ui/GoldenFirefly';
import { Hud } from './ui/Hud';
import { OfflinePanel } from './ui/OfflinePanel';
import { SettingsPanel } from './ui/SettingsPanel';
import { StorePanel } from './ui/StorePanel';
import { TutorialOverlay } from './ui/TutorialOverlay';
import { UpgradePanel } from './ui/UpgradePanel';
import { ZoneToast } from './ui/ZoneToast';

/** Geliştirme modunda ya da EXPO_PUBLIC_SHOW_FPS=1 ile alınan test build'lerinde FPS sayacı görünür. */
const SHOW_FPS = __DEV__ || process.env.EXPO_PUBLIC_SHOW_FPS === '1';

export default function App() {
  const ready = usePersistence();
  const lang = useLanguage();
  useTutorialDriver();
  const [newZone, clearNewZone] = useGameEvents();
  const floaters = useRef<FloatingNumbersHandle>(null);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const close = () => setPanel(null);

  // Satın alımlar açılışta; reklamlar (rıza formu ve ATT istemi) onboarding bittikten sonra.
  const tutorialDone = useGame((s) => s.tutorialStep >= TUTORIAL_STEP.done);
  useEffect(() => {
    if (ready) void initIap();
  }, [ready]);
  useEffect(() => {
    if (ready && tutorialDone) void initAds();
  }, [ready, tutorialDone]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root}>
          {ready ? (
            <>
              <ForestCanvas onLightGained={(a, x, y) => floaters.current?.spawn(a, x, y)} />
              {/* Dil değişince arayüz yeniden kurulur (sahne etkilenmez). */}
              <View key={lang} style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <Hud onOpenSettings={() => setPanel('settings')} />
              <FloatingNumbers ref={floaters} />
              <ComboCounter />
              <GoldenFirefly />
              <BoostButton />
              {newZone !== null ? <ZoneToast zone={newZone} onDone={clearNewZone} /> : null}
              <TutorialOverlay />
              <BottomBar onOpen={setPanel} />
              {panel === 'upgrades' ? <UpgradePanel onClose={close} /> : null}
              {panel === 'dawn' ? <DawnPanel onClose={close} /> : null}
              {panel === 'store' ? <StorePanel onClose={close} /> : null}
              {panel === 'settings' ? <SettingsPanel onClose={close} /> : null}
              <OfflinePanel />
              <DawnFlash />
              {SHOW_FPS ? <FpsOverlay onLongPress={() => setPanel('events')} /> : null}
              {SHOW_FPS && panel === 'events' ? <EventsPanel onClose={close} /> : null}
              </View>
            </>
          ) : null}
        </View>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
});
