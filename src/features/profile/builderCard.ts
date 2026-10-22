import { SOCIAL_KEYS } from '@/features/profile/fields';
import type { UserProfile } from '@/store/AppStore';

/** The name, role, bio and photo the listing's builder card should show. */
export function builderFromUser(user: UserProfile) {
  const handle = user.username ? `@${user.username}` : '';
  const builder =
    user.showAs === 'realName' && user.realName ? user.realName : handle || user.realName || 'You';

  return {
    builder,
    builderPhoto: user.photo,
    role: [user.job, user.department, user.workplace].filter(Boolean).join(' · '),
    style: user.bio,
    skills: user.tags.sk ?? [],
    builderSocials: user.socials.filter(([, value]) => !!value),
    githubCommits: user.githubCommits,
  };
}

export function socialsFromLinks(links: Record<string, string> | null | undefined): [string, string][] {
  return SOCIAL_KEYS.filter(([key]) => links?.[key]).map(([key, label]) => [label, links![key]]);
}
