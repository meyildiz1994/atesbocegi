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
  /** Game Center sıralamaları (App Store Connect'teki kimliklerle aynı). */
  leaderboards: {
    tower: 'glowjar.tower_best',
    light: 'glowjar.lifetime_light',
    stardust: 'glowjar.stardust',
  },
  /** RevenueCat genel (public) SDK anahtarları. */
  revenueCat: {
    /** Herkese açık SDK anahtarı (RevenueCat, uygulamaya gömülmek için). */
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? 'appl_QdidBJaOsQSdmqaGzfRFPCNQDgU',
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  },
  /** RevenueCat'te tanımlanacak yetki (entitlement) ve ürün kimlikleri (App Store'daki ürün kimlikleriyle aynı). */
  iap: {
    entitlements: {
      removeAds: 'no_ads',
      starter: 'starter',
      vip: 'vip',
      skin_ember: 'skin_ember',
      skin_aurora: 'skin_aurora',
      skin_sakura: 'skin_sakura',
    },
    products: {
      removeAds: 'atesbocegi.remove_ads',
      starter: 'atesbocegi.starter_pack',
      starterLaunch: 'atesbocegi.starter_pack_launch',
      vip: 'atesbocegi.vip_monthly',
      pass: 'atesbocegi.night_pass',
      tokens1: 'atesbocegi.tokens_1',
      tokens2: 'atesbocegi.tokens_2',
      tokens3: 'atesbocegi.tokens_3',
      tokens4: 'atesbocegi.tokens_4',
      light1: 'atesbocegi.light_1',
      light2: 'atesbocegi.light_2',
      light3: 'atesbocegi.light_3',
      skin_ember: 'atesbocegi.skin_ember',
      skin_aurora: 'atesbocegi.skin_aurora',
      skin_sakura: 'atesbocegi.skin_sakura',
    },
    /** Abonelik olan ürünler (diğerleri tek seferlik veya tüketilebilir). */
    subscriptions: ['vip'],
  },
} as const;
