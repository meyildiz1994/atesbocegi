import { useEffect } from 'react';

import { track } from '../services/analytics';

/** Ödüllü reklam teklifi görünür olduğunda bir kez `ad_offer_shown` gönderir. */
export function useAdOffer(placement: string, visible: boolean): void {
  useEffect(() => {
    if (visible) track('ad_offer_shown', { placement });
  }, [placement, visible]);
}
