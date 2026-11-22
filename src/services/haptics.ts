import * as Haptics from 'expo-haptics';

import { FEEDBACK } from '../config/balance';
import { useGame } from '../game/state';

let lastLight = 0;
const minGapMs = 1000 / FEEDBACK.maxHapticsPerSecond;

function enabled(): boolean {
  return useGame.getState().settings.haptics;
}

/** Toplama: hafif. Seri toplamada saniyede en fazla FEEDBACK.maxHapticsPerSecond kez. */
export function hapticCollect(): void {
  if (!enabled()) return;
  const now = Date.now();
  if (now - lastLight < minGapMs) return;
  lastLight = now;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Kavanoz boşaltma: orta. */
export function hapticJarEmpty(): void {
  if (!enabled()) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Bölge açılması, prestij: başarı. */
export function hapticSuccess(): void {
  if (!enabled()) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
