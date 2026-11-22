/**
 * Analitik olayları. Faz 9'da gerçek sağlayıcıya (Firebase/PostHog) bağlanacak;
 * şimdilik geliştirme modunda konsola yazar.
 */
export type AnalyticsParams = Record<string, string | number | boolean>;

export function track(event: string, params: AnalyticsParams = {}): void {
  if (__DEV__) console.log(`[analytics] ${event}`, params);
}
