import { MOON_CYCLES } from '../config/balance';
import { moonComplete, moonRules } from './moonCycle';
import { useGame } from './state';

test('ilk gece kuralsız, aylar zorlaşır', () => {
  expect(moonRules(0).speed).toBe(1);
  expect(moonRules(0).dust).toBe(1);
  expect(moonRules(2).speed).toBeGreaterThan(moonRules(1).speed);
  expect(moonRules(3).dust).toBeGreaterThan(moonRules(2).dust);
});

test('Tutulma katmanları sonsuz', () => {
  const last = MOON_CYCLES.cycles.length - 1;
  expect(moonRules(last).id).toBe('eclipse');
  expect(moonRules(last).layer).toBe(1);
  expect(moonRules(last + 3).layer).toBe(4);
  expect(moonRules(last + 3).speed).toBeGreaterThan(moonRules(last).speed);
});

test('tamamlanma eşiği', () => {
  expect(moonComplete(MOON_CYCLES.completeAt - 1)).toBe(false);
  expect(moonComplete(MOON_CYCLES.completeAt)).toBe(true);
});

test('ay tamamlanınca Şafak sonraki aya geçirir, ilk girişte jeton', () => {
  const g = useGame.getState;
  g().resetProgress(0);
  useGame.setState({ runLight: MOON_CYCLES.completeAt, jarTokens: 0 });
  expect(g().prestige()).toBeGreaterThan(0);
  expect(g().moonCycle).toBe(1);
  expect(g().jarTokens).toBe(MOON_CYCLES.firstTimeTokens);
  useGame.setState({ runLight: 2_000_000 });
  g().prestige();
  expect(g().moonCycle).toBe(1);
});
