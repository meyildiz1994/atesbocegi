import { advanceTutorial, showBottomBar, TUTORIAL_STEP, tutorialFireflyCap, type TutorialSnapshot } from './tutorial';

const base: TutorialSnapshot = {
  jarCount: 0,
  jarCapacity: 10,
  lifetimeLight: 0,
  prestigeCount: 0,
  anyUpgradeOwned: false,
  anyUpgradeAffordable: false,
};

describe('tutorial', () => {
  it('ilk toplamada sürükleme adımı biter', () => {
    expect(advanceTutorial(TUTORIAL_STEP.drag, base)).toBe(TUTORIAL_STEP.drag);
    expect(advanceTutorial(TUTORIAL_STEP.drag, { ...base, jarCount: 1 })).toBe(TUTORIAL_STEP.fill);
  });

  it('kavanoz dolunca dokunma ipucu, boşaltınca serbest toplama', () => {
    expect(advanceTutorial(TUTORIAL_STEP.fill, { ...base, jarCount: 10 })).toBe(TUTORIAL_STEP.tapJar);
    expect(advanceTutorial(TUTORIAL_STEP.tapJar, { ...base, lifetimeLight: 10 })).toBe(TUTORIAL_STEP.earn);
  });

  it('yükseltme alınabilir olunca gösterilir, alınınca biter', () => {
    const s = { ...base, lifetimeLight: 10 };
    expect(advanceTutorial(TUTORIAL_STEP.earn, s)).toBe(TUTORIAL_STEP.earn);
    expect(advanceTutorial(TUTORIAL_STEP.earn, { ...s, anyUpgradeAffordable: true })).toBe(TUTORIAL_STEP.upgrade);
    expect(advanceTutorial(TUTORIAL_STEP.upgrade, { ...s, anyUpgradeOwned: true })).toBe(TUTORIAL_STEP.tour);
    // İkon tanıtımı yalnızca oyuncunun dokunuşuyla biter.
    expect(advanceTutorial(TUTORIAL_STEP.tour, { ...s, anyUpgradeOwned: true })).toBe(TUTORIAL_STEP.tour);
    expect(advanceTutorial(TUTORIAL_STEP.done, base)).toBe(TUTORIAL_STEP.done);
  });

  it('birden fazla adım tek seferde geçilebilir; eski kayıtlar onboarding görmez', () => {
    expect(advanceTutorial(0, { ...base, lifetimeLight: 50, anyUpgradeAffordable: true })).toBe(TUTORIAL_STEP.upgrade);
    expect(advanceTutorial(0, { ...base, prestigeCount: 1 })).toBe(TUTORIAL_STEP.tour);
  });

  it('böcek sınırı ve alt çubuk', () => {
    expect(tutorialFireflyCap(0, 30)).toBe(1);
    expect(tutorialFireflyCap(1, 30)).toBe(6);
    expect(tutorialFireflyCap(3, 30)).toBe(30);
    expect(showBottomBar(2)).toBe(false);
    expect(showBottomBar(3)).toBe(true);
  });
});
