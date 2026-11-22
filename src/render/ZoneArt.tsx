import { Group, Image, Rect, useImage } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { ZONE_ART } from '../config/balance';
import { ZONE_BACKGROUNDS } from './zoneImages';

type Props = {
  zoneIndex: number;
  width: number;
  height: number;
  brightness: SharedValue<number>;
  /** Görsel yüklenene kadar çizilecek kodla çizilmiş arka plan. */
  fallback: React.ReactNode;
};

/**
 * Bölgenin ChatGPT ile üretilmiş arka planı. Aydınlık düşükken neredeyse siyah bir örtü
 * altındadır; oyuncu ışık topladıkça örtü kalkar ve bölge görünür hale gelir.
 */
export function ZoneArt({ zoneIndex, width, height, brightness, fallback }: Props) {
  const image = useImage(ZONE_BACKGROUNDS[zoneIndex] ?? ZONE_BACKGROUNDS[0]);
  const veil = useDerivedValue(
    () => 1 - (ZONE_ART.minVisible + (ZONE_ART.maxVisible - ZONE_ART.minVisible) * brightness.value),
  );
  if (!image) return <>{fallback}</>;
  return (
    <Group>
      <Image image={image} x={0} y={0} width={width} height={height} fit="cover" />
      <Rect x={0} y={0} width={width} height={height} color="black" opacity={veil} />
    </Group>
  );
}
