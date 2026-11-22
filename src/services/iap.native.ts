/**
 * RevenueCat ile uygulama içi satın almalar. Anahtar yoksa (henüz hesap kurulmadıysa)
 * mağaza "şu an kullanılamıyor" der; oyun etkilenmez.
 * Satın alım durumu kayda da yazılır, böylece çevrimdışıyken de geçerlidir.
 */
import { Platform } from 'react-native';

import { APP_CONFIG } from '../config/app';
import { useGame } from '../game/state';
import { track } from './analytics';
import type { BuyResult, ProductKind, StoreProduct } from './iap';

export type { BuyResult, ProductKind, StoreProduct } from './iap';

type RC = typeof import('react-native-purchases').default;
type CustomerInfo = import('react-native-purchases').CustomerInfo;
type Pkg = import('react-native-purchases').PurchasesPackage;

let Purchases: RC | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Purchases = (require('react-native-purchases') as typeof import('react-native-purchases')).default;
} catch {
  Purchases = null;
}

const apiKey = Platform.OS === 'ios' ? APP_CONFIG.revenueCat.ios : APP_CONFIG.revenueCat.android;
let configured = false;
const packages = new Map<ProductKind, Pkg>();

const KIND_BY_PRODUCT: Record<string, ProductKind> = {
  [APP_CONFIG.iap.products.removeAds]: 'removeAds',
  [APP_CONFIG.iap.products.starter]: 'starter',
  [APP_CONFIG.iap.products.starterLaunch]: 'starterLaunch',
};

function apply(info: CustomerInfo): void {
  const active = info.entitlements.active;
  useGame.getState().setPurchases({
    removeAds: !!active[APP_CONFIG.iap.entitlements.removeAds],
    starter: !!active[APP_CONFIG.iap.entitlements.starter],
  });
}

export function iapAvailable(): boolean {
  return !!Purchases && !!apiKey;
}

export async function initIap(): Promise<void> {
  if (configured || !Purchases || !apiKey) return;
  try {
    Purchases.configure({ apiKey });
    configured = true;
    Purchases.addCustomerInfoUpdateListener(apply);
    apply(await Purchases.getCustomerInfo());
  } catch {
    // Ağ yoksa kayıttaki son bilinen durum geçerli kalır.
  }
}

export async function loadProducts(): Promise<StoreProduct[]> {
  if (!configured || !Purchases) return [];
  try {
    const offerings = await Purchases.getOfferings();
    const list: StoreProduct[] = [];
    packages.clear();
    for (const p of offerings.current?.availablePackages ?? []) {
      const kind = KIND_BY_PRODUCT[p.product.identifier];
      if (!kind) continue;
      packages.set(kind, p);
      list.push({ kind, title: p.product.title, price: p.product.priceString });
    }
    return list;
  } catch {
    return [];
  }
}

export async function buy(kind: ProductKind): Promise<BuyResult> {
  const pkg = packages.get(kind);
  if (!Purchases || !pkg) return 'failed';
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    apply(customerInfo);
    track('iap_purchase', { product: kind });
    return 'purchased';
  } catch (e) {
    return (e as { userCancelled?: boolean }).userCancelled ? 'cancelled' : 'failed';
  }
}

/** Satın alımları geri yükler; en az bir yetki varsa true. */
export async function restore(): Promise<boolean> {
  if (!configured || !Purchases) return false;
  try {
    const info = await Purchases.restorePurchases();
    apply(info);
    return Object.keys(info.entitlements.active).length > 0;
  } catch {
    return false;
  }
}
