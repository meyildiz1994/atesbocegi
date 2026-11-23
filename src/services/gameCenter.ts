/**
 * Game Center (yalnızca iOS; başka yerde sessizce hiçbir şey yapmaz).
 * Oturum açılışta bir kez istenir; skorlar Şafak'ta, kulede ve uygulama arka plana geçince gönderilir.
 */
import { Platform } from 'react-native';

import { GameCenter } from '../../modules/glowjar-game-center';
import { APP_CONFIG } from '../config/app';
import { useGame } from '../game/state';

export type Board = keyof typeof APP_CONFIG.leaderboards;

let signedIn = false;
const last: Partial<Record<Board, number>> = {};

export function gameCenterAvailable(): boolean {
  return Platform.OS === 'ios' && !!GameCenter;
}

export async function initGameCenter(): Promise<void> {
  if (!gameCenterAvailable() || signedIn) return;
  try {
    signedIn = await GameCenter!.authenticate();
    if (signedIn) submitAll();
  } catch {
    signedIn = false;
  }
}

export function submitScore(board: Board, value: number): void {
  if (!signedIn || !GameCenter) return;
  const v = Math.floor(Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, value)));
  if ((last[board] ?? -1) >= v) return;
  last[board] = v;
  GameCenter.submitScore(APP_CONFIG.leaderboards[board], v).catch(() => {
    last[board] = undefined;
  });
}

/** Kayıttaki en iyi değerleri gönderir (açılışta ve arka plana geçerken). */
export function submitAll(): void {
  const s = useGame.getState();
  submitScore('tower', s.towerFloor);
  submitScore('light', s.lifetimeLight);
  submitScore('stardust', s.stardustEarned);
}

export async function showLeaderboard(board: Board): Promise<boolean> {
  if (!gameCenterAvailable()) return false;
  if (!signedIn) await initGameCenter();
  if (!signedIn) return false;
  await GameCenter!.showLeaderboard(APP_CONFIG.leaderboards[board]);
  return true;
}
