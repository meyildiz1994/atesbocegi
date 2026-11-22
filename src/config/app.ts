/**
 * Uygulama kimlikleri ve bağlantılar (denge sayısı değil). Gerçek değerler build ortamından
 * EXPO_PUBLIC_* değişkenleriyle gelir; yoksa Google'ın test reklamları kullanılır ve
 * satın alma kapalı kalır.
 */
export const APP_CONFIG = {
  privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://docs.google.com/document/d/1hW75ZN4oGEL--nWhurw80nhRxIyPwPWqf6REgNiSenc',
  /** PostHog proje anahtarı (genel, istemci tarafı) ve sunucusu. Anahtar yoksa olaylar yalnızca cihazda tutulur. */
  posthog: {
    key: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
  },
  admob: {
    /** Test build'lerinde 1: gerçek birimler yerine Google test reklamları. */
    forceTestAds: process.env.EXPO_PUBLIC_ADMOB_TEST === '1',
    ios: {
      rewarded: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED ?? 'ca-app-pub-4059277331959292/9305673512',
      interstitial: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL ?? 'ca-app-pub-4059277331959292/1030889838',
    },
    android: {
      rewarded: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED ?? 'ca-app-pub-4059277331959292/2152399812',
      interstitial: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL ?? 'ca-app-pub-4059277331959292/6926922181',
    },
  },
  /** RevenueCat genel (public) SDK anahtarları. */
  revenueCat: {
    /** Herkese açık SDK anahtarı (RevenueCat, uygulamaya gömülmek için). */
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? 'appl_QdidBJaOsQSdmqaGzfRFPCNQDgU',
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
