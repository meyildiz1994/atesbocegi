/**
 * RevenueCat ile uygulama içi satın almalar. Anahtar yoksa (henüz hesap kurulmadıysa)
 * mağaza "şu an kullanılamıyor" der; oyun etkilenmez.
 * Satın alım durumu kayda da yazılır, böylece çevrimdışıyken de geçerlidir.
 */
import { Platform } from 'react-native';

import { APP_CONFIG } from '../config/app';
import { useGame } from '../game/state';
import { track } from './analytics';
import { grantProduct } from './grants';
import type { BuyResult, ProductKind, StoreProduct } from './iap';

export type { BuyResult, ProductKind, StoreProduct } from './iap';

type RC = typeof import('react-native-purchases').default;
type CustomerInfo = import('react-native-purchases').CustomerInfo;

let Purchases: RC | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Purchases = (require('react-native-purchases') as typeof import('react-native-purchases')).default;
} catch {
  Purchases = null;
}

const apiKey = Platform.OS === 'ios' ? APP_CONFIG.revenueCat.ios : APP_CONFIG.revenueCat.android;
let configured = false;
type StoreItem = import('react-native-purchases').PurchasesStoreProduct;
const items = new Map<ProductKind, StoreItem>();

const IDS = APP_CONFIG.iap.products;
const ENT = APP_CONFIG.iap.entitlements;
const KIND_BY_PRODUCT = Object.fromEntries(Object.entries(IDS).map(([k, id]) => [id, k as ProductKind])) as Record<string, ProductKind>;
const SUBS = APP_CONFIG.iap.subscriptions as readonly ProductKind[];

function apply(info: CustomerInfo): void {
  const active = info.entitlements.active;
  const vip = !!active[ENT.vip];
  const g = useGame.getState();
  g.setPurchases({ removeAds: vip || !!active[ENT.removeAds], starter: !!active[ENT.starter], vip });
  const skins = (['ember', 'aurora', 'sakura'] as const).filter((id) => !!active[ENT[`skin_${id}`]]);
  if (skins.length) g.grantSkins(skins);
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

/**
 * Ürünleri doğrudan mağazadan ister (RevenueCat "offering" kurulumuna bağlı değil):
 * offering boş olsa da mağaza dolu görünür.
 */
export async function loadProducts(): Promise<StoreProduct[]> {
  if (!configured || !Purchases) return [];
  const P = Purchases;
  const kinds = Object.keys(IDS) as ProductKind[];
  const ids = (sub: boolean) => kinds.filter((k) => SUBS.includes(k) === sub).map((k) => IDS[k]);
  try {
    const [one, subs] = await Promise.all([
      P.getProducts(ids(false), P.PRODUCT_CATEGORY.NON_SUBSCRIPTION).catch(() => [] as StoreItem[]),
      P.getProducts(ids(true), P.PRODUCT_CATEGORY.SUBSCRIPTION).catch(() => [] as StoreItem[]),
    ]);
    items.clear();
    const list: StoreProduct[] = [];
    for (const p of [...one, ...subs]) {
      const kind = KIND_BY_PRODUCT[p.identifier];
      if (!kind) continue;
      items.set(kind, p);
      list.push({ kind, title: p.title, price: p.priceString });
    }
    track('iap_products', { count: list.length });
    return list;
  } catch {
    return [];
  }
}

export async function buy(kind: ProductKind): Promise<BuyResult> {
  const item = items.get(kind);
  if (!Purchases || !item) return 'failed';
  try {
    const { customerInfo } = await Purchases.purchaseStoreProduct(item);
    apply(customerInfo);
    grantProduct(kind);
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
