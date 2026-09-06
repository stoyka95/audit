declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Zapíše událost do dataLayeru pro GTM/GA4. Bez souhlasu s cookies se GTM
 * vůbec nenačte (viz CookieConsent), takže se pole jen tiše naplní v paměti
 * a nikam neodejde — push je tedy bezpečný volat vždy, bez ohledu na souhlas.
 */
export function pushDataLayerEvent(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...params });
}

/** Jen doména auditované adresy — do GA4 nemá smysl posílat celou URL s cestou a parametry. */
export function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
