export const DEFAULT_CULTURE = 'en';
export const SUPPORTED_CULTURES = Object.freeze(['en', 'ar']);

export function getCurrentCulture(locationRef = globalThis.window?.location) {
  const requested = new URLSearchParams(locationRef?.search || '').get('culture');
  return SUPPORTED_CULTURES.includes(requested) ? requested : DEFAULT_CULTURE;
}

export function applyDocumentCulture(documentRef = globalThis.document, culture = getCurrentCulture()) {
  if (!documentRef?.documentElement) return culture;
  documentRef.documentElement.lang = culture;
  documentRef.documentElement.dir = culture === 'ar' ? 'rtl' : 'ltr';
  return culture;
}

export function cultureUrl(culture, locationRef = globalThis.window?.location) {
  if (!SUPPORTED_CULTURES.includes(culture)) throw new RangeError(`Unsupported culture: ${culture}`);
  const url = new URL(locationRef?.href || 'http://localhost/');
  url.searchParams.set('culture', culture);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function withCurrentCulture(href, locationRef = globalThis.window?.location) {
  if (!href || /^(?:[a-z]+:|#)/i.test(href)) return href;
  const origin = locationRef?.origin || 'http://localhost';
  const url = new URL(href, origin);
  if (url.origin !== origin) return href;
  url.searchParams.set('culture', getCurrentCulture(locationRef));
  return `${url.pathname}${url.search}${url.hash}`;
}
