/**
 * Satın alma servisi, web ve test sürümü: mağaza yok. Gerçek uygulama `iap.native.ts`'i kullanır.
 */
import type { APP_CONFIG } from '../config/app';

export type ProductKind = keyof typeof APP_CONFIG.iap.products;
export type StoreProduct = { kind: ProductKind; title: string; price: string };
export type BuyResult = 'purchased' | 'cancelled' | 'failed';

export function iapAvailable(): boolean {
  return false;
}

export async function initIap(): Promise<void> {}

export async function loadProducts(): Promise<StoreProduct[]> {
  return [];
}

export async function buy(_kind: ProductKind): Promise<BuyResult> {
  return 'failed';
}

export async function restore(): Promise<boolean> {
  return false;
}
