import { NIGHT_PASS } from '../config/balance';
import { useGame } from './state';
import { currentPass, emptyPass, lightForHours, passClaimable, passReward, passTier, seasonOf } from './store';

const T = NIGHT_PASS.epochMs + 3 * 86_400_000;

test('sezon ve basamak', () => {
  expect(seasonOf(NIGHT_PASS.epochMs - 1000)).toBe(0);
  expect(seasonOf(NIGHT_PASS.epochMs + NIGHT_PASS.seasonDays * 86_400_000)).toBe(1);
  expect(passTier(NIGHT_PASS.jarsPerTier * 3 + 5)).toBe(3);
  expect(passTier(1e9)).toBe(NIGHT_PASS.tiers);
  expect(currentPass({ ...emptyPass(0), jars: 50 }, NIGHT_PASS.epochMs + 40 * 86_400_000).jars).toBe(0);
});

test('premium son basamak kostüm verir', () => {
  expect(passReward(NIGHT_PASS.tiers, true).skin).toBe(NIGHT_PASS.finalSkin);
  expect(passReward(5, true).lightHours).toBeGreaterThan(0);
  expect(passReward(3, false).tokens).toBeGreaterThan(0);
});

test('Işık kesesi en az taban kadar', () => {
  expect(lightForHours(2, 0, 100)).toBeGreaterThan(0);
  expect(lightForHours(2, 1000, 1)).toBe(1000 * 3600 * 2);
});

test('Gece Kartı ödülü alınır, iki kez alınmaz; premium kilitli', () => {
  const g = useGame.getState;
  g().resetProgress(T);
  useGame.setState({ pass: { ...emptyPass(seasonOf(T)), jars: NIGHT_PASS.jarsPerTier * 2 } });
  expect(passClaimable(g().pass!)).toBe(2);
  const before = g().jarTokens;
  expect(g().claimPass(1, false, T)).not.toBeNull();
  expect(g().jarTokens).toBeGreaterThan(before);
  expect(g().claimPass(1, false, T)).toBeNull();
  expect(g().claimPass(1, true, T)).toBeNull();
  g().activatePass(T);
  expect(g().claimPass(1, true, T)).not.toBeNull();
  expect(g().claimPass(3, false, T)).toBeNull();
});

test('kostüm sahip olunmadan seçilemez; ilerleme sıfırlansa da kalır', () => {
  const g = useGame.getState;
  g().resetProgress(T);
  g().setSkin('ember');
  expect(g().skin).toBeNull();
  g().grantSkins(['ember']);
  g().setSkin('ember');
  g().resetProgress(T);
  expect(g().skin).toBe('ember');
});
