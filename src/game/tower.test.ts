import { TOWER } from '../config/balance';
import { useGame } from './state';
import { towerGoal, towerReward, towerRule, towerTriesLeft } from './tower';

test('hedef katla büyür, en az taban', () => {
  expect(towerGoal(1, 0)).toBe(TOWER.minGoal);
  expect(towerGoal(10, 3)).toBeGreaterThan(towerGoal(1, 3));
});

test('kurallar döner, 10. kat sandık', () => {
  expect(towerRule(1)).toBe('fast');
  expect(towerReward(10).chest).toBe(true);
  expect(towerReward(10).stardust).toBe(TOWER.chestStardust);
  expect(towerReward(3).chest).toBe(false);
});

test('haklar günlük yenilenir', () => {
  expect(towerTriesLeft('2026-11-24', '2026-11-23', 3, 0)).toBe(TOWER.dailyTries);
  expect(towerTriesLeft('2026-11-23', '2026-11-23', 3, 1)).toBe(1);
});

test('kazanmak kat ve ödül verir, kaybetmek hak yer', () => {
  const g = useGame.getState;
  g().resetProgress(0);
  const now = Date.UTC(2026, 10, 23, 12);
  g().towerWin(1);
  expect(g().towerFloor).toBe(1);
  expect(g().jarTokens).toBe(towerReward(1).tokens);
  g().towerWin(1);
  expect(g().towerFloor).toBe(1);
  g().towerFail(now);
  expect(g().towerTries).toBe(1);
  useGame.setState({ jarTokens: 100 });
  expect(g().towerBuyTry(now)).toBe(true);
  expect(g().jarTokens).toBe(100 - TOWER.extraTryTokens);
});
