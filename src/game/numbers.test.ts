import { formatNumber, suffixFor } from './numbers';

describe('formatNumber', () => {
  it('küçük sayıları olduğu gibi gösterir', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(12.7)).toBe('12');
  });
  it('K/M/B/T kısaltmaları', () => {
    expect(formatNumber(1234)).toBe('1.2K');
    expect(formatNumber(3.4e6)).toBe('3.4M');
    expect(formatNumber(5.6e9)).toBe('5.6B');
    expect(formatNumber(7.8e12)).toBe('7.8T');
  });
  it('T sonrası aa, ab notasyonu', () => {
    expect(formatNumber(1e15)).toBe('1.0aa');
    expect(formatNumber(2.5e18)).toBe('2.5ab');
    expect(suffixFor(5 + 26)).toBe('ba');
  });
  it('yuvarlama sınırında taşmaz', () => {
    expect(formatNumber(999999)).toBe('999.9K');
  });
  it('negatif ve sonsuz', () => {
    expect(formatNumber(-1500)).toBe('-1.5K');
    expect(formatNumber(Infinity)).toBe('∞');
  });
});
