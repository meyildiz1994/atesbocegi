// Web yalnızca geliştirme/önizleme içindir (Skia web = CanvasKit). Mağaza hedefi iOS/Android.
import '@expo/metro-runtime';
import { registerRootComponent } from 'expo';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }).then(async () => {
  const App = (await import('./src/App')).default;
  registerRootComponent(App);
});
