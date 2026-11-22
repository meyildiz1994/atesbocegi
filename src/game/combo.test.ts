import { COMBO } from '../config/balance';
import { addCatch, comboCount, comboPitch, newCombo } from './combo';

describe('combo', () => {
  it('pencere içinde birikir, dışında sıfırlanır', () => {
    let c = addCatch(newCombo(), 1, 0);
    c = addCatch(c, 2, COMBO.windowMs - 1);
    expect(comboCount(c, COMBO.windowMs)).toBe(3);
    expect(comboCount(c, COMBO.windowMs * 3)).toBe(0);
    c = addCatch(c, 1, COMBO.windowMs * 3);
    expect(c.count).toBe(1);
  });

  it('perde yükselir ve sınırlanır', () => {
    expect(comboPitch(1)).toBe(1);
    expect(comboPitch(2)).toBeGreaterThan(1);
    expect(comboPitch(1000)).toBeCloseTo(comboPitch(COMBO.maxPitchSteps + 1));
  });
});
