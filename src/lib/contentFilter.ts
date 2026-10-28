/**
 * A first-pass reject list so objectionable copy never reaches other builders.
 * Reports still catch what a list cannot.
 */
const BLOCKED = [
  'child porn',
  'childporn',
  'csam',
  'nigger',
  'faggot',
  'rape me',
  'kill yourself',
  'kys',
];

export function blockedPhrase(text: string): string | null {
  const hay = text.toLowerCase();
  return BLOCKED.find((phrase) => hay.includes(phrase)) ?? null;
}

export function assertClean(text: string): void {
  if (blockedPhrase(text)) {
    throw new Error('That text is not allowed. Please rephrase.');
  }
}
