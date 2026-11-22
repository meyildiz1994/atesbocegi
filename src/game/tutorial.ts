/**
 * Onboarding adımları (saf). Oyuncu metin okumadan ilerlesin diye her adım tek bir
 * eylem bekler ve 3–4 kelimelik bir ipucu gösterir.
 */
import { TUTORIAL } from '../config/balance';

export const TUTORIAL_STEP = {
  /** Tek böcek, "sürükle" ipucu. İlk toplamada biter. */
  drag: 0,
  /** Birkaç böcek daha; kavanoz dolunca biter. */
  fill: 1,
  /** "Kavanoza dokun" ipucu; ilk boşaltmada biter. */
  tapJar: 2,
  /** Serbest toplama; ilk yükseltme alınabilir olunca biter. */
  earn: 3,
  /** Yükseltme butonunu göster; ilk satın almada biter. */
  upgrade: 4,
  done: 5,
} as const;

export type TutorialSnapshot = {
  jarCount: number;
  jarCapacity: number;
  lifetimeLight: number;
  prestigeCount: number;
  anyUpgradeOwned: boolean;
  anyUpgradeAffordable: boolean;
};

/** Tek adımlık geçiş kuralı. */
function advanceOnce(step: number, s: TutorialSnapshot): number {
  switch (step) {
    case TUTORIAL_STEP.drag:
      return s.jarCount > 0 || s.lifetimeLight > 0 ? TUTORIAL_STEP.fill : step;
    case TUTORIAL_STEP.fill:
      if (s.lifetimeLight > 0) return TUTORIAL_STEP.tapJar;
      return s.jarCount >= s.jarCapacity ? TUTORIAL_STEP.tapJar : step;
    case TUTORIAL_STEP.tapJar:
      return s.lifetimeLight > 0 ? TUTORIAL_STEP.earn : step;
    case TUTORIAL_STEP.earn:
      return s.anyUpgradeAffordable || s.anyUpgradeOwned ? TUTORIAL_STEP.upgrade : step;
    case TUTORIAL_STEP.upgrade:
      return s.anyUpgradeOwned ? TUTORIAL_STEP.done : step;
    default:
      return TUTORIAL_STEP.done;
  }
}

/** Mevcut duruma göre gelinen adım (birden fazla adım birden geçilebilir). */
export function advanceTutorial(step: number, s: TutorialSnapshot): number {
  // Eski kayıtlar ya da prestij yapmış oyuncular onboarding görmez.
  if (s.prestigeCount > 0 || s.anyUpgradeOwned) return TUTORIAL_STEP.done;
  let cur = step;
  for (;;) {
    const next = advanceOnce(cur, s);
    if (next === cur) return cur;
    cur = next;
  }
}

/** Onboarding sırasında ekrandaki böcek sınırı. */
export function tutorialFireflyCap(step: number, normalMax: number): number {
  if (step <= TUTORIAL_STEP.drag) return Math.min(normalMax, TUTORIAL.firstFireflies);
  if (step < TUTORIAL_STEP.earn) return Math.min(normalMax, TUTORIAL.earlyFireflies);
  return normalMax;
}

/** Alt çubuk (mağaza, yükseltmeler) ilk boşaltmadan sonra belirir. */
export function showBottomBar(step: number): boolean {
  return step >= TUTORIAL_STEP.earn;
}
