import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { COLORS } from './config/balance';
import { usePersistence } from './game/persistence';
import { useGameEvents } from './game/useGameEvents';
import { useTutorialDriver } from './game/useTutorial';
import { ForestCanvas } from './render/ForestCanvas';
import { ComboCounter } from './ui/ComboCounter';
import { BottomBar, type PanelId } from './ui/BottomBar';
import { DawnFlash } from './ui/DawnFlash';
import { DawnPanel } from './ui/DawnPanel';
import { FloatingNumbers, type FloatingNumbersHandle } from './ui/FloatingNumbers';
import { FpsOverlay } from './ui/FpsOverlay';
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
  useTutorialDriver();
  const [newZone, clearNewZone] = useGameEvents();
  const floaters = useRef<FloatingNumbersHandle>(null);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const close = () => setPanel(null);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root}>
          {ready ? (
            <>
              <ForestCanvas onLightGained={(a, x, y) => floaters.current?.spawn(a, x, y)} />
              <Hud onOpenSettings={() => setPanel('settings')} />
              <FloatingNumbers ref={floaters} />
              <ComboCounter />
              {newZone !== null ? <ZoneToast zone={newZone} onDone={clearNewZone} /> : null}
              <TutorialOverlay />
              <BottomBar onOpen={setPanel} />
              {panel === 'upgrades' ? <UpgradePanel onClose={close} /> : null}
              {panel === 'dawn' ? <DawnPanel onClose={close} /> : null}
              {panel === 'store' ? <StorePanel onClose={close} /> : null}
              {panel === 'settings' ? <SettingsPanel onClose={close} /> : null}
              <OfflinePanel />
              <DawnFlash />
              {SHOW_FPS ? <FpsOverlay /> : null}
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
