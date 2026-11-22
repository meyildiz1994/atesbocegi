import { useEffect } from 'react';

import { UPGRADE_ORDER } from '../config/balance';
import { track } from '../services/analytics';
import { levelsLeft, upgradeCost } from './economy';
import { statsOf, useGame, type GameState } from './state';
import { advanceTutorial, TUTORIAL_STEP } from './tutorial';

function snapshotOf(s: GameState) {
  return {
    jarCount: s.jarCount,
    jarCapacity: statsOf(s).jarCapacity,
    lifetimeLight: s.lifetimeLight,
    prestigeCount: s.prestigeCount,
    anyUpgradeOwned: UPGRADE_ORDER.some((id) => s.levels[id] > 0),
    anyUpgradeAffordable: UPGRADE_ORDER.some(
      (id) => levelsLeft(id, s.levels[id]) > 0 && s.light >= upgradeCost(id, s.levels[id]),
    ),
  };
}

/** Store'u izler ve onboarding adımını ilerletir. */
export function useTutorialDriver(): void {
  useEffect(() => {
    const check = (s: GameState) => {
      if (s.tutorialStep >= TUTORIAL_STEP.done) return;
      const next = advanceTutorial(s.tutorialStep, snapshotOf(s));
      if (next !== s.tutorialStep) {
        useGame.getState().setTutorialStep(next);
        track('tutorial_step', { step: next });
        if (next >= TUTORIAL_STEP.done) track('tutorial_complete', {});
      }
    };
    check(useGame.getState());
    return useGame.subscribe(check);
  }, []);
}
