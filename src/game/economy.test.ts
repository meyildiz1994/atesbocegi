import { jarPayout, zoneBrightness } from './economy';

describe('jarPayout', () => {
  it('sayı × değer × çarpan', () => {
    expect(jarPayout(10, 1, 1)).toBe(10);
    expect(jarPayout(10, 2, 4)).toBe(80);
  });
  it('boş kavanoz 0', () => {
    expect(jarPayout(0, 5, 5)).toBe(0);
    expect(jarPayout(-3, 5, 5)).toBe(0);
  });
});

describe('zoneBrightness', () => {
  it('0 ışıkta 0, hedefte 1, üstünde 1', () => {
    expect(zoneBrightness(0, 6)).toBe(0);
    expect(zoneBrightness(999_999, 6)).toBeCloseTo(1, 5);
    expect(zoneBrightness(1e12, 6)).toBe(1);
  });
  it('logaritmik artar', () => {
    expect(zoneBrightness(99, 6)).toBeCloseTo(2 / 6, 5);
  });
});
