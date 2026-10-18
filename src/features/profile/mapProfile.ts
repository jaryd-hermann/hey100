import type { Profile, ProfilePatch } from '@/data/repo/profile';
import type { UserProfile } from '@/store/AppStore';

/**
 * The two directions live together so they cannot drift. `links` is the spec's
 * {x, github, linkedin, web}; the client carries the same data as
 * [label, value] pairs, and the tag groups keep their onboarding keys.
 */
const SOCIALS: [key: string, label: string][] = [
  ['x', 'X'],
  ['github', 'GitHub'],
  ['linkedin', 'LinkedIn'],
  ['web', 'Web'],
];

const TAG_GROUPS: [group: string, column: 'looking_for' | 'app_interests' | 'life_tags' | 'test_devices'][] =
  [
    ['look', 'looking_for'],
    ['cat', 'app_interests'],
    ['l', 'life_tags'],
    ['d', 'test_devices'],
  ];

export function toUserProfile(row: Profile): Partial<UserProfile> {
  const links = (row.links ?? {}) as Record<string, string>;
  const ownWords = (row.own_words ?? {}) as Record<string, string>;
  const visibility = (row.visibility ?? {}) as Record<string, boolean>;

  return {
    // Apple can decline to give a name, so an empty one must not blank the
    // name the user already has.
    ...(row.real_name ? { realName: row.real_name } : {}),
    ...(row.username ? { username: row.username } : {}),
    ...(row.photo_url ? { photo: row.photo_url } : {}),
    showAs: row.display_pref === 'real_name' ? 'realName' : 'username',
    job: row.job ?? '',
    workplace: row.workplace ?? '',
    ...(ownWords.bio ? { bio: ownWords.bio } : {}),
    socials: SOCIALS.filter(([key]) => links[key]).map(
      ([key, label]) => [label, links[key]] as [string, string],
    ),
    tags: Object.fromEntries(TAG_GROUPS.map(([group, column]) => [group, row[column]])),
    ownWords,
    // The database stores what is visible; the store tracks what is hidden.
    hidden: Object.fromEntries(
      Object.entries(visibility)
        .filter(([, visible]) => visible === false)
        .map(([field]) => [field, true]),
    ),
    referralCode: row.referral_code,
    bonusMatches: row.bonus_matches,
  };
}

export function toProfilePatch(user: Partial<UserProfile>): ProfilePatch {
  const patch: ProfilePatch = {};

  if (user.realName !== undefined) patch.real_name = user.realName || null;
  if (user.username !== undefined) patch.username = user.username || null;
  if (user.photo !== undefined) patch.photo_url = user.photo || null;
  if (user.showAs !== undefined) {
    patch.display_pref = user.showAs === 'realName' ? 'real_name' : 'username';
  }
  if (user.job !== undefined) patch.job = user.job || null;
  if (user.workplace !== undefined) patch.workplace = user.workplace || null;

  if (user.ownWords !== undefined || user.bio !== undefined) {
    patch.own_words = {
      ...(user.ownWords ?? {}),
      ...(user.bio !== undefined ? { bio: user.bio } : {}),
    };
  }

  if (user.socials !== undefined) {
    const byLabel = new Map(user.socials.map(([label, value]) => [label, value]));
    patch.links = Object.fromEntries(
      SOCIALS.map(([key, label]) => [key, byLabel.get(label) ?? '']).filter(([, value]) => value),
    );
  }

  if (user.tags !== undefined) {
    for (const [group, column] of TAG_GROUPS) {
      if (user.tags[group]) patch[column] = user.tags[group];
    }
  }

  if (user.hidden !== undefined) {
    patch.visibility = Object.fromEntries(
      Object.entries(user.hidden).map(([field, isHidden]) => [field, !isHidden]),
    );
  }

  return patch;
}
