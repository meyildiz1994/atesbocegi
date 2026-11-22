import { NUMBER_FORMAT } from '../config/balance';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/** 1000'in kuvvet indeksine göre son ek: 0→'', 1→K … 4→T, 5→aa, 6→ab … */
export function suffixFor(tier: number): string {
  const { suffixes } = NUMBER_FORMAT;
  if (tier < suffixes.length) return suffixes[tier] ?? '';
  const i = tier - suffixes.length;
  const first = Math.floor(i / ALPHABET.length);
  const second = i % ALPHABET.length;
  return ALPHABET.charAt(first % ALPHABET.length) + ALPHABET.charAt(second);
}

/** Büyük sayı biçimlendirme: 1234 → "1.2K", 3.4e6 → "3.4M", 1e15 → "1.0aa". */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '-∞';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs < NUMBER_FORMAT.abbreviateFrom) return sign + String(Math.floor(abs));

  let tier = Math.floor(Math.log10(abs) / 3);
  let scaled = abs / Math.pow(1000, tier);
  const factor = Math.pow(10, NUMBER_FORMAT.decimals);
  scaled = Math.floor(scaled * factor) / factor;
  if (scaled >= 1000) {
    tier += 1;
    scaled /= 1000;
  }
  return sign + scaled.toFixed(NUMBER_FORMAT.decimals) + suffixFor(tier);
}
