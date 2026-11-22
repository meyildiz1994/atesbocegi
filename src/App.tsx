import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { COLORS } from './config/balance';
import { ForestCanvas } from './render/ForestCanvas';
import { FloatingNumbers, type FloatingNumbersHandle } from './ui/FloatingNumbers';
import { FpsOverlay } from './ui/FpsOverlay';
import { Hud } from './ui/Hud';

/** Geliştirme modunda ya da EXPO_PUBLIC_SHOW_FPS=1 ile alınan test build'lerinde FPS sayacı görünür. */
const SHOW_FPS = __DEV__ || process.env.EXPO_PUBLIC_SHOW_FPS === '1';

export default function App() {
  const floaters = useRef<FloatingNumbersHandle>(null);
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root}>
          <ForestCanvas onLightGained={(a, x, y) => floaters.current?.spawn(a, x, y)} />
          <Hud />
          <FloatingNumbers ref={floaters} />
          {SHOW_FPS ? <FpsOverlay /> : null}
        </View>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
});
