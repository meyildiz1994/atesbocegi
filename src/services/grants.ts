/** Tüketilebilir satın alımların karşılığını verir (jeton, Işık kesesi, Gece Kartı). */
import type { LightPackId, TokenPackId } from '../config/balance';
import { useGame } from '../game/state';
import { lightPack, tokenPack } from '../game/store';
import type { ProductKind } from './iap';

const TOKEN_KINDS: ProductKind[] = ['tokens1', 'tokens2', 'tokens3', 'tokens4'];
const LIGHT_KINDS: ProductKind[] = ['light1', 'light2', 'light3'];

/** Satın alım başarılı olunca çağrılır. Tek seferlik/abonelik ürünleri yetkiden gelir, burada bir şey yapılmaz. */
export function grantProduct(kind: ProductKind, now = Date.now()): void {
  const g = useGame.getState();
  if (TOKEN_KINDS.includes(kind)) g.grantTokens(tokenPack(kind as TokenPackId).tokens);
  else if (LIGHT_KINDS.includes(kind)) g.grantLightHours(lightPack(kind as LightPackId).hours, now);
  else if (kind === 'pass') g.activatePass(now);
}
