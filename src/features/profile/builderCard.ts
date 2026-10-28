import { SOCIAL_KEYS } from '@/features/profile/fields';
import type { UserProfile } from '@/store/AppStore';

/** Job title and company only — department stays off the card. */
export function builderRole(job?: string | null, workplace?: string | null): string {
  return [job?.trim(), workplace?.trim()].filter(Boolean).join(' · ');
}

/** Older listings stored job · department · company. Keep the ends. */
export function publicRole(role?: string | null): string {
  const parts = (role ?? '')
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 3) return `${parts[0]} · ${parts[parts.length - 1]}`;
  return parts.join(' · ');
}

/** The name, role, bio and photo the listing's builder card should show. */
export function builderFromUser(user: UserProfile) {
  const handle = user.username ? `@${user.username}` : '';
  const builder =
    user.showAs === 'realName' && user.realName ? user.realName : handle || user.realName || 'You';

  return {
    builder,
    builderPhoto: user.photo,
    role: builderRole(user.job, user.workplace),
    style: user.bio,
    skills: user.tags.sk ?? [],
    interests: user.tags.cat ?? [],
    builderSocials: user.socials.filter(([, value]) => !!value),
    githubCommits: user.githubCommits,
  };
}

export function socialsFromLinks(links: Record<string, string> | null | undefined): [string, string][] {
  return SOCIAL_KEYS.filter(([key]) => links?.[key]).map(([key, label]) => [label, links![key]]);
}
