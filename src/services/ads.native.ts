/**
 * AdMob: ödüllü reklam + bölge geçişinde seyrek geçiş reklamı.
 * Sıra: onboarding biter → Google UMP rıza formu (AB) → iOS ATT istemi → SDK başlar.
 * Kimlikler yoksa Google test reklamları kullanılır.
 */
import { Platform } from 'react-native';
import { create } from 'zustand';

import { APP_CONFIG } from '../config/app';
import { ADS_RETRY_MS } from '../config/balance';
import { canShowInterstitial } from '../game/monetization';
import { useGame } from '../game/state';
import { track } from './analytics';

type AdsModule = typeof import('react-native-google-mobile-ads');
type RewardedAd = import('react-native-google-mobile-ads').RewardedAd;
type InterstitialAd = import('react-native-google-mobile-ads').InterstitialAd;

let ads: AdsModule | null = null;
try {
  // Yerel modül yoksa (ör. Expo Go) oyun reklamsız çalışır.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ads = require('react-native-google-mobile-ads') as AdsModule;
} catch {
  ads = null;
}

const useAdsState = create<{ rewardedLoaded: boolean; privacyRequired: boolean }>(() => ({
  rewardedLoaded: false,
  privacyRequired: false,
}));

let initPromise: Promise<void> | null = null;
let rewarded: RewardedAd | null = null;
let interstitial: InterstitialAd | null = null;
let interstitialLoaded = false;

function unitIds() {
  // Test build'lerinde (TestFlight / iç test) gerçek reklam birimine tıklamak hesabı riske atar: Google test reklamları.
  if (__DEV__ || APP_CONFIG.admob.forceTestAds) {
    return { rewarded: ads!.TestIds.REWARDED, interstitial: ads!.TestIds.INTERSTITIAL };
  }
  const ids = Platform.OS === 'ios' ? APP_CONFIG.admob.ios : APP_CONFIG.admob.android;
  return {
    rewarded: ids.rewarded || ads!.TestIds.REWARDED,
    interstitial: ids.interstitial || ads!.TestIds.INTERSTITIAL,
  };
}

function loadRewarded(): void {
  if (!ads) return;
  const r = ads.RewardedAd.createForAdRequest(unitIds().rewarded);
  r.addAdEventListener(ads.RewardedAdEventType.LOADED, () => useAdsState.setState({ rewardedLoaded: true }));
  r.addAdEventListener(ads.AdEventType.ERROR, () => {
    useAdsState.setState({ rewardedLoaded: false });
    setTimeout(loadRewarded, ADS_RETRY_MS);
  });
  rewarded = r;
  r.load();
}

function loadInterstitial(): void {
  if (!ads) return;
  const i = ads.InterstitialAd.createForAdRequest(unitIds().interstitial);
  interstitialLoaded = false;
  i.addAdEventListener(ads.AdEventType.LOADED, () => {
    interstitialLoaded = true;
  });
  i.addAdEventListener(ads.AdEventType.ERROR, () => {
    interstitialLoaded = false;
    setTimeout(loadInterstitial, ADS_RETRY_MS);
  });
  i.addAdEventListener(ads.AdEventType.CLOSED, () => loadInterstitial());
  interstitial = i;
  i.load();
}

async function requestTracking(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const att = await import('expo-tracking-transparency');
    await att.requestTrackingPermissionsAsync();
  } catch {
    // ATT yoksa reklamlar kişiselleştirilmeden gösterilir.
  }
}

async function doInit(): Promise<void> {
  if (!ads) return;
  let canRequest = true;
  try {
    const info = await ads.AdsConsent.gatherConsent();
    canRequest = info.canRequestAds;
    useAdsState.setState({
      privacyRequired: info.privacyOptionsRequirementStatus === ads.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    });
  } catch {
    // Rıza formu yüklenemezse (çevrimdışı) önceki karar geçerli; SDK kendisi kontrol eder.
  }
  if (!canRequest) return;
  await requestTracking();
  await ads.default().initialize();
  loadRewarded();
  if (!useGame.getState().purchases.removeAds) loadInterstitial();
}

/** Onboarding bittikten sonra bir kez çağrılır. */
export function initAds(): Promise<void> {
  if (!initPromise) initPromise = doInit().catch(() => undefined);
  return initPromise;
}

/** Ödüllü teklif gösterilebilir mi? "Reklamları Kaldır" sahipleri için her zaman evet. */
export function useRewardedReady(): boolean {
  const loaded = useAdsState((s) => s.rewardedLoaded);
  const removeAds = useGame((s) => s.purchases.removeAds);
  return removeAds || loaded;
}

/** Ödüllü reklam gösterir; ödül kazanılırsa true. "Reklamları Kaldır" sahipleri reklamsız alır. */
export function showRewarded(placement: string): Promise<boolean> {
  if (useGame.getState().purchases.removeAds) {
    track('ad_watched', { placement, skipped: true });
    return Promise.resolve(true);
  }
  const r = rewarded;
  if (!ads || !r || !useAdsState.getState().rewardedLoaded) return Promise.resolve(false);
  const A = ads;
  return new Promise((resolve) => {
    let earned = false;
    const offEarned = r.addAdEventListener(A.RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const finish = () => {
      offEarned();
      offClosed();
      offError();
      useAdsState.setState({ rewardedLoaded: false });
      if (earned) track('ad_watched', { placement });
      loadRewarded();
      resolve(earned);
    };
    const offClosed = r.addAdEventListener(A.AdEventType.CLOSED, finish);
    const offError = r.addAdEventListener(A.AdEventType.ERROR, finish);
    r.show().catch(finish);
  });
}

/** Bölge geçişinde çağrılır; kurallar uygunsa geçiş reklamı gösterir. */
export async function maybeShowInterstitial(placement: 'zone' | 'timer' = 'zone'): Promise<void> {
  const s = useGame.getState();
  const now = Date.now();
  if (!interstitial || !interstitialLoaded) return;
  if (
    !canShowInterstitial({
      nowMs: now,
      playTimeSec: s.playTimeSec,
      lastInterstitialAt: s.lastInterstitialAt,
      removeAds: s.purchases.removeAds,
    })
  ) {
    return;
  }
  s.markInterstitial(now);
  interstitialLoaded = false;
  track('ad_watched', { placement: `interstitial_${placement}` });
  await interstitial.show().catch(() => undefined);
}

export function privacyOptionsRequired(): boolean {
  return useAdsState.getState().privacyRequired;
}

/** AB kullanıcıları için reklam rızasını yeniden düzenleme formu. */
export async function showPrivacyOptions(): Promise<void> {
  if (!ads) return;
  await ads.AdsConsent.showPrivacyOptionsForm().catch(() => undefined);
}
