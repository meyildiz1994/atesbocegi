import { requireOptionalNativeModule } from 'expo';

type GameCenterNative = {
  authenticate(): Promise<boolean>;
  submitScore(leaderboardId: string, score: number): Promise<boolean>;
  showLeaderboard(leaderboardId: string): Promise<void>;
};

/** iOS'ta yerel modül; başka yerde (web, Android, test) null. */
export const GameCenter = requireOptionalNativeModule<GameCenterNative>('GlowjarGameCenter');
