/**
 * Uygulama kimlikleri ve bağlantılar (denge sayısı değil). Gerçek değerler build ortamından
 * EXPO_PUBLIC_* değişkenleriyle gelir; yoksa Google'ın test reklamları kullanılır ve
 * satın alma kapalı kalır.
 */
export const APP_CONFIG = {
  privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? '',
  admob: {
    ios: {
      rewarded: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED ?? '',
      interstitial: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL ?? '',
    },
    android: {
      rewarded: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED ?? '',
      interstitial: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL ?? '',
    },
  },
  /** RevenueCat genel (public) SDK anahtarları. */
  revenueCat: {
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  },
  /** RevenueCat'te tanımlanacak yetki (entitlement) ve ürün kimlikleri. */
  iap: {
    entitlements: { removeAds: 'no_ads', starter: 'starter' },
    products: {
      removeAds: 'atesbocegi.remove_ads',
      starter: 'atesbocegi.starter_pack',
      starterLaunch: 'atesbocegi.starter_pack_launch',
    },
  },
} as const;
