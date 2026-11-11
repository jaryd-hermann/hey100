'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { VerifiedBadge } from '@/components/app/Marks';
import { useMe } from '@/components/app/MeContext';
import { createClient } from '@/lib/supabase/client';
import { publicAvatarUrl } from '@/lib/site';

const SOCIAL_FIELDS: [key: string, label: string, placeholder: string][] = [
  ['x', 'X', '@handle'],
  ['github', 'GitHub', 'username'],
  ['linkedin', 'LinkedIn', 'username'],
  ['instagram', 'Instagram', '@handle'],
  ['tiktok', 'TikTok', '@handle'],
  ['youtube', 'YouTube', '@handle'],
  ['discord', 'Discord', 'username'],
  ['web', 'Web', 'yoursite.com'],
];

type ProfileRow = {
  real_name: string | null;
  username: string | null;
  photo_url: string | null;
  job: string | null;
  workplace: string | null;
  industry: string | null;
  company_size: string | null;
  department: string | null;
  years_experience: string | null;
  own_words: Record<string, string> | null;
  links: Record<string, string> | null;
  looking_for: string[] | null;
  app_interests: string[] | null;
  test_devices: string[] | null;
  skills: string[] | null;
  github_login: string | null;
  github_commits: number | null;
  referral_code: string | null;
};

export function Profile() {
  const me = useMe();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [karmaOpen, setKarmaOpen] = useState(false);
  const [row, setRow] = useState<ProfileRow | null>(null);
  const [name, setName] = useState(me.realName ?? '');
  const [username, setUsername] = useState(me.username ?? '');
  const [job, setJob] = useState(me.job ?? '');
  const [workplace, setWorkplace] = useState('');
  const [bio, setBio] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [department, setDepartment] = useState('');
  const [years, setYears] = useState('');
  const [links, setLinks] = useState<Record<string, string>>({});
  const [skills, setSkills] = useState('');
  const [looking, setLooking] = useState('');

  useEffect(() => {
    void (async () => {
      const { data } = await createClient()
        .from('profiles')
        .select(
          'real_name, username, photo_url, job, workplace, industry, company_size, department, years_experience, own_words, links, looking_for, app_interests, test_devices, skills, github_login, github_commits, referral_code',
        )
        .eq('id', me.id)
        .maybeSingle();
      if (!data) return;
      const next = data as ProfileRow;
      setRow(next);
      setName(next.real_name ?? '');
      setUsername(next.username ?? '');
      setJob(next.job ?? '');
      setWorkplace(next.workplace ?? '');
      setBio(typeof next.own_words?.bio === 'string' ? next.own_words.bio : '');
      setIndustry(next.industry ?? '');
      setCompanySize(next.company_size ?? '');
      setDepartment(next.department ?? '');
      setYears(next.years_experience ?? '');
      setLinks(next.links ?? {});
      setSkills((next.skills ?? []).join(', '));
      setLooking((next.looking_for ?? []).join(', '));
    })();
  }, [me.id]);

  const photo = publicAvatarUrl(row?.photo_url) ?? me.photoUrl;
  const handle = username || me.username || 'you';
  const socials = SOCIAL_FIELDS.filter(([key]) => links[key]).map(([key, label]) => [label, links[key]] as const);
  const role = [job, workplace].filter(Boolean).join(' at ');

  const save = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await createClient()
      .from('profiles')
      .update({
        real_name: name || null,
        username: username || null,
        job: job || null,
        workplace: workplace || null,
        industry: industry || null,
        company_size: companySize || null,
        department: department || null,
        years_experience: years || null,
        own_words: { ...(row?.own_words ?? {}), bio },
        links: Object.fromEntries(Object.entries(links).filter(([, value]) => value.trim())),
        skills: skills.split(',').map((item) => item.trim()).filter(Boolean),
        looking_for: looking.split(',').map((item) => item.trim()).filter(Boolean),
      })
      .eq('id', me.id);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSaved(true);
    setEditing(false);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="profile-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Profile</h1>
        <button className="btn-line" type="button" onClick={() => setEditing((value) => !value)}>
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="profile-hero">
        {photo ? (
          <img src={photo} alt="" />
        ) : (
          <span className="row-fallback">{(handle || 'Y').slice(0, 1).toUpperCase()}</span>
        )}
        <strong style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 22 }}>
          {name || handle}
          {me.verified ? <VerifiedBadge /> : null}
        </strong>
        <span className="muted">@{handle}</span>
        <span style={{ color: 'var(--at)', font: "12.5px 'JetBrains Mono', monospace" }}>hey100.com/{handle}</span>
        {role ? <p className="muted">{role}</p> : null}
      </div>

      {editing ? (
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label className="eyebrow">Your name</label>
          <input value={name} onChange={(event) => setName(event.target.value)} />
          <label className="eyebrow">Username</label>
          <input value={username} onChange={(event) => setUsername(event.target.value)} />
          <label className="eyebrow">Bio</label>
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} rows={3} />
          <label className="eyebrow">Day job</label>
          <input value={job} onChange={(event) => setJob(event.target.value)} placeholder="Job title" />
          <label className="eyebrow">Workplace</label>
          <input value={workplace} onChange={(event) => setWorkplace(event.target.value)} placeholder="Company" />
          <label className="eyebrow">Industry</label>
          <input value={industry} onChange={(event) => setIndustry(event.target.value)} />
          <label className="eyebrow">Company size</label>
          <input value={companySize} onChange={(event) => setCompanySize(event.target.value)} />
          <label className="eyebrow">Department</label>
          <input value={department} onChange={(event) => setDepartment(event.target.value)} />
          <label className="eyebrow">Years of experience</label>
          <input value={years} onChange={(event) => setYears(event.target.value)} />
          <label className="eyebrow">Skills</label>
          <input value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Comma separated" />
          <label className="eyebrow">Looking for</label>
          <input value={looking} onChange={(event) => setLooking(event.target.value)} placeholder="Comma separated" />
          {SOCIAL_FIELDS.map(([key, label, placeholder]) => (
            <label key={key} className="eyebrow">
              {label}
              <input
                value={links[key] ?? ''}
                onChange={(event) => setLinks((prev) => ({ ...prev, [key]: event.target.value }))}
                placeholder={placeholder}
                style={{ marginTop: 6, width: '100%' }}
              />
            </label>
          ))}
          {error ? <p className="muted">{error}</p> : null}
          <button className="btn-accent" type="submit" disabled={busy}>
            {busy ? 'Saving…' : saved ? 'Saved' : 'Save profile'}
          </button>
        </form>
      ) : (
        <>
          {bio ? <p>{bio}</p> : (
            <button className="text-link" type="button" onClick={() => setEditing(true)}>
              Add a bio
            </button>
          )}
          {socials.length ? (
            <div className="social-pills">
              {socials.map(([label, value]) => (
                <span key={label}>
                  {label} · {value}
                </span>
              ))}
            </div>
          ) : null}

          <Link className="settings-row" href="/pro">
            <div>
              Subscription
              <span>{me.plan === 'pro' ? 'Hey100 Pro' : 'Tap to upgrade · $18/mo'}</span>
            </div>
          </Link>

          <button className="karma-card" type="button" onClick={() => setKarmaOpen(true)}>
            <span className="eyebrow">Block Points</span>
            <b>{me.karma}</b>
            <span className="muted">
              {me.verified
                ? 'Verified badge unlocked. Tap to see how Block Points work.'
                : `${Math.max(0, 100 - me.karma)} more to unlock the verified badge.`}
            </span>
          </button>

          <div className="feedback-card">
            <div className="stat-thirds">
              <div>
                <b>{me.counters?.heys_today ?? 0}</b>
                <span>Heys given</span>
              </div>
              <div>
                <b>{me.counters?.matches ?? 0}</b>
                <span>Matches</span>
              </div>
              <div>
                <b>{me.plan === 'pro' ? 'Pro' : 'Free'}</b>
                <span>Plan</span>
              </div>
            </div>
          </div>

          <div className="feedback-card">
            <span className="eyebrow">GitHub</span>
            <strong>
              {row?.github_commits != null
                ? `${row.github_commits.toLocaleString()} commits`
                : row?.github_login
                  ? `@${row.github_login}`
                  : 'Connect GitHub on iOS'}
            </strong>
            <p className="muted">Shows your total commits as a builder</p>
          </div>

          <div className="feedback-card">
            <strong>Invite builders</strong>
            <p className="muted">You both get +3 matches when they publish a listing.</p>
            <code>hey100.com/i/{row?.referral_code || handle}</code>
          </div>
        </>
      )}

      {karmaOpen ? (
        <div className="modal-scrim" onClick={() => setKarmaOpen(false)} role="presentation">
          <div className="modal-card insights-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Block Points</h2>
            <p>
              Block Points are trust in the community. You earn them by matching, replying, giving feedback, posting,
              joining groups, verifying your product, and making a strong listing.
            </p>
            <p>500 Block Points unlock a verified badge on your profile.</p>
            <button className="btn-accent" type="button" onClick={() => setKarmaOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
