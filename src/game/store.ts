/** Mağaza kuralları: Işık kesesi, kostümler, Gece Işığı (VIP) ve Gece Kartı sezonları. Saf. */
import { NIGHT_PASS, SKIN_ORDER, STORE, VIP, type LightPackId, type SkinId, type TokenPackId } from '../config/balance';

export type PassState = {
  season: number;
  /** Bu sezon doldurulan (yarıdan fazla dolu) kavanoz. */
  jars: number;
  premium: boolean;
  /** Alınmış basamaklar (1..tiers). */
  claimedFree: number[];
  claimedPremium: number[];
};

const DAY_MS = 86_400_000;

export function seasonOf(now: number): number {
  return Math.max(0, Math.floor((now - NIGHT_PASS.epochMs) / (NIGHT_PASS.seasonDays * DAY_MS)));
}

export function seasonEndsAt(season: number): number {
  return NIGHT_PASS.epochMs + (season + 1) * NIGHT_PASS.seasonDays * DAY_MS;
}

export const emptyPass = (season: number): PassState => ({
  season,
  jars: 0,
  premium: false,
  claimedFree: [],
  claimedPremium: [],
});

/** Sezon değiştiyse yeni, boş bir kart. */
export function currentPass(p: PassState | null, now: number): PassState {
  const s = seasonOf(now);
  return p && p.season === s ? p : emptyPass(s);
}

/** Ulaşılan basamak (0..tiers). */
export function passTier(jars: number): number {
  return Math.min(NIGHT_PASS.tiers, Math.floor(jars / NIGHT_PASS.jarsPerTier));
}

export type PassReward = { tokens: number; lightHours: number; skin: SkinId | null };

export function passReward(tier: number, premium: boolean): PassReward {
  if (!premium) return { tokens: tier % 2 === 0 ? NIGHT_PASS.freeTokens * 2 : NIGHT_PASS.freeTokens, lightHours: 0, skin: null };
  if (tier === NIGHT_PASS.tiers) return { tokens: NIGHT_PASS.premiumTokens, lightHours: 0, skin: NIGHT_PASS.finalSkin };
  const light = NIGHT_PASS.premiumLightTiers.includes(tier);
  return { tokens: light ? 0 : NIGHT_PASS.premiumTokens, lightHours: light ? NIGHT_PASS.premiumLightHours : 0, skin: null };
}

/** Alınmayı bekleyen ödül sayısı (rozet için). */
export function passClaimable(p: PassState): number {
  const reached = passTier(p.jars);
  let n = 0;
  for (let t = 1; t <= reached; t++) {
    if (!p.claimedFree.includes(t)) n++;
    if (p.premium && !p.claimedPremium.includes(t)) n++;
  }
  return n;
}

export function tokenPack(id: TokenPackId) {
  return STORE.tokenPacks.find((p) => p.id === id)!;
}

export function lightPack(id: LightPackId) {
  return STORE.lightPacks.find((p) => p.id === id)!;
}

/** `hours` saatlik Işık: o anki Işık/sn'ye göre, ama en az saat başına birkaç dolu kavanoz. */
export function lightForHours(hours: number, lightPerSecond: number, jarValue: number): number {
  return Math.max(lightPerSecond * 3600, jarValue * STORE.lightMinJarsPerHour) * hours;
}

export function skinColor(id: SkinId | null): string | null {
  if (!id) return null;
  return STORE.skins.find((s) => s.id === id)?.color ?? null;
}

export function isSkin(v: unknown): v is SkinId {
  return typeof v === 'string' && (SKIN_ORDER as string[]).includes(v);
}

export function vipMultiplier(vip: boolean): number {
  return vip ? VIP.lightMult : 1;
}
