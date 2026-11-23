import { CONSTELLATIONS } from '../config/balance';
import { emptySky, skyCost, skyEffects } from './constellations';

test('maliyet artar, etkiler yıldızla büyür', () => {
  expect(skyCost('hunter', 1)).toBeGreaterThan(skyCost('hunter', 0));
  expect(skyEffects(emptySky()).value).toBe(1);
  expect(skyEffects({ ...emptySky(), hunter: 2 }).value).toBeCloseTo(1 + 2 * CONSTELLATIONS.hunter.perStar);
});

test('tamamlanınca mekanik açılır', () => {
  const full = { ...emptySky(), gardener: CONSTELLATIONS.gardener.stars.length, shepherd: 2 };
  expect(skyEffects(full).autoMushroom).toBe(true);
  expect(skyEffects(full).windEverywhere).toBe(false);
});
