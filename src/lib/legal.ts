import { router } from 'expo-router';

export const TERMS_URL = 'https://hey100.com/terms';
export const PRIVACY_URL = 'https://hey100.com/privacy';

export type LegalPage = 'terms' | 'privacy';

export function legalUrl(page: LegalPage): string {
  return page === 'terms' ? TERMS_URL : PRIVACY_URL;
}

/** Opens the live legal page in the in-app browser. */
export function openLegal(page: LegalPage) {
  router.push({ pathname: '/browser', params: { kind: 'Web', value: legalUrl(page) } });
}
