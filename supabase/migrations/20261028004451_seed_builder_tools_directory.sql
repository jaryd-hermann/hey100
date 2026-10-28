-- Seed the Pro builder tools directory from The Diff stack.
-- Subtitles are the product one-liners. Existing names keep their ids and votes.

insert into public.sponsored_tools (name, subtitle, url, logo_url, sort_order, category)
values
  -- Development
  (
    'Xcode',
    'Apple''s IDE for building iOS apps.',
    'https://developer.apple.com/xcode/',
    'https://www.google.com/s2/favicons?sz=128&domain=developer.apple.com',
    10,
    'Development'
  ),
  (
    'Simulator',
    'Runs iOS apps on virtual devices.',
    'https://developer.apple.com/documentation/xcode/running-your-app-in-simulator-or-on-a-device',
    'https://www.google.com/s2/favicons?sz=128&domain=developer.apple.com',
    20,
    'Development'
  ),
  (
    'Android Studio',
    'The official IDE for Android.',
    'https://developer.android.com/studio',
    'https://www.google.com/s2/favicons?sz=128&domain=developer.android.com',
    30,
    'Development'
  ),
  (
    'Firebase',
    'Google''s mobile app backend and analytics suite.',
    'https://firebase.google.com/',
    'https://www.google.com/s2/favicons?sz=128&domain=firebase.google.com',
    40,
    'Development'
  ),
  (
    'Expo',
    'Framework for cross-platform React Native apps.',
    'https://expo.dev',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/2fc01694-fd97-43b5-b74e-f0d510ba6704/expo.png?t=1779104706',
    50,
    'Development'
  ),

  -- Backend
  (
    'Supabase',
    'Open-source Postgres backend with auth & storage.',
    'https://supabase.com/',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/33c85211-9f8b-497e-8d21-1ced71ddae40/icon.jpeg?t=1780885196',
    60,
    'Backend'
  ),
  (
    'GitHub',
    'Code hosting, version control, and collaboration.',
    'https://github.com',
    'https://www.google.com/s2/favicons?sz=128&domain=github.com',
    70,
    'Backend'
  ),
  (
    'Steel',
    'Browser infrastructure for AI agents.',
    'https://www.steel.dev',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/b43f7502-6da5-4b39-af48-14d7190dfdae/logo.eba6ac6f.png?t=1780886360',
    80,
    'Backend'
  ),
  (
    'Serper',
    'Fast Google Search API.',
    'https://serper.dev/',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/561e3306-0404-454a-9748-18f3da5fbbbd/1709176631773.jpeg?t=1780886423',
    90,
    'Backend'
  ),
  (
    'Vercel',
    'Hosting and deployment for web apps.',
    'https://vercel.com',
    'https://www.google.com/s2/favicons?sz=128&domain=vercel.com',
    100,
    'Backend'
  ),

  -- Messaging
  (
    'Resend',
    'Developer-first transactional email API.',
    'https://resend.com/',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/db2be608-d8c9-47b6-b188-b651a673955d/resend-icon-white.png?t=1780885332',
    110,
    'Messaging'
  ),
  (
    'OneSignal',
    'Cross-platform push and in-app messaging.',
    'https://www.onesignal.com',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/c05aa661-072c-4fb2-ab8f-b788ff4fa631/onesignal.png?t=1780885352',
    120,
    'Messaging'
  ),

  -- AI
  (
    'Claude',
    'Anthropic''s AI assistant.',
    'https://www.claude.com',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/904fb0d3-a24a-40a1-b6ba-ec8cb5a250d4/claude-ai-icon.webp?t=1780885545',
    130,
    'AI'
  ),
  (
    'Cursor',
    'The AI-native code editor.',
    'https://www.cursor.com',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/b525a5c5-3459-4b49-bd2a-5cbcbfdf10f0/0_zWCTHFNFdGAgSw2d.jpg?t=1780885285',
    140,
    'AI'
  ),
  (
    'Tendem',
    'Human + AI working assistant by Toloka.',
    'https://tendem.ai',
    'https://www.google.com/s2/favicons?sz=128&domain=tendem.ai',
    150,
    'AI'
  ),
  (
    'Granola',
    'AI notepad for meetings.',
    'https://www.granola.ai',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/33b56535-bd17-4d53-bc02-d9ed57f0d1c2/nav-icon-ios-rebrand.png?t=1781887062',
    160,
    'AI'
  ),
  (
    'Wispr Flow',
    'AI voice dictation for your computer.',
    'https://wisprflow.ai',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/0bbf9216-7733-49fc-b18b-65c8386bcea3/68d427c7c5f98194a1c53c61_logo-symbol-dark.png?t=1780885361',
    170,
    'AI'
  ),
  (
    'Quicker',
    'Chat for builders.',
    'https://quicker.chat/',
    'https://www.google.com/s2/favicons?sz=128&domain=quicker.chat',
    180,
    'AI'
  ),

  -- Design
  (
    'Figma',
    'Collaborative design and prototyping.',
    'https://www.figma.com',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/f8ce55a4-8b31-4a51-924c-a1ebe170715a/Screenshot_2026-06-07_at_10.37.14_PM.png?t=1780886259',
    190,
    'Design'
  ),
  (
    'html.to.design',
    'Import any website into Figma.',
    'https://html.to.design/',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/8ab12151-d939-4df4-a29e-617349ee9300/Screenshot_2026-06-07_at_10.26.59_PM.png?t=1780885634',
    200,
    'Design'
  ),
  (
    'Descript',
    'Edit audio and video like a document.',
    'https://www.descript.com',
    'https://www.google.com/s2/favicons?sz=128&domain=descript.com',
    210,
    'Design'
  ),
  (
    'Loom',
    'Async screen and video recording.',
    'https://www.loom.com',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/36406a68-a325-4d68-b871-62b269235b66/9714361627859_75b15ab87e28ddf24bae_512.png?t=1780886127',
    220,
    'Design'
  ),

  -- Monetization
  (
    'RevenueCat',
    'In-app subscription infrastructure.',
    'https://www.revenuecat.com',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/9ae45500-d175-4963-923e-1f8d6c85ae9a/revenuecar.png?t=1780885056',
    230,
    'Monetization'
  ),
  (
    'Stripe',
    'Online payments infrastructure.',
    'https://stripe.com',
    'https://www.google.com/s2/favicons?sz=128&domain=stripe.com',
    240,
    'Monetization'
  ),

  -- Growth
  (
    'PostHog',
    'Product analytics, replays, and flags.',
    'https://posthog.com',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/f68d81c4-c780-4ad4-9482-3563cbf742ff/bltun1nd1o90zjbpyy3kli6cu03e.png?t=1780885166',
    250,
    'Growth'
  ),
  (
    'beehiiv',
    'All-in-one newsletter platform.',
    'https://www.beehiiv.com',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/0420cc7e-12f2-46af-909d-fbed27b01e7c/channels4_profile.jpg?t=1780885126',
    260,
    'Growth'
  ),
  (
    'Attio',
    'The AI-native CRM.',
    'https://attio.com',
    'https://www.google.com/s2/favicons?sz=128&domain=attio.com',
    270,
    'Growth'
  ),
  (
    'Passionfroot',
    'Sponsorship booking for creators.',
    'https://www.passionfroot.me',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/31c5535e-ccca-48ab-b0f9-f50cf5ac3e36/passionfrootme_logo.jpeg?t=1780885472',
    280,
    'Growth'
  ),
  (
    'Athyna',
    'Remote hiring of vetted global talent.',
    'https://www.athyna.com',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/394ce64d-76cc-4673-a34f-ba9ecf4dd79f/images.jpeg?t=1780885456',
    290,
    'Growth'
  ),

  -- Productivity
  (
    'Rezonant',
    'Agents product context across your apps.',
    'https://www.rezonant.app',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/48542aee-53ab-491d-b9d4-be959e8c710b/Screenshot_2026-06-07_at_10.20.33_PM.png?t=1780885244',
    300,
    'Productivity'
  ),
  (
    'Notion',
    'Docs, wikis, and project planning.',
    'https://www.notion.so',
    'https://www.google.com/s2/favicons?sz=128&domain=notion.so',
    310,
    'Productivity'
  ),
  (
    'Superhuman',
    'The fastest email experience, with AI built in.',
    'https://superhuman.com/',
    'https://www.google.com/s2/favicons?sz=128&domain=superhuman.com',
    320,
    'Productivity'
  ),
  (
    'Obsidian',
    'Local-first markdown notes.',
    'https://obsidian.md/',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/a5aa20ad-3ee0-4e0f-9323-47eb847b8f69/9f1b5b46aed533f5386cf276ab2cdce48cbd2e25.png?t=1780886491',
    330,
    'Productivity'
  ),
  (
    'LegalZoom',
    'Online legal and business setup.',
    'https://www.legalzoom.com/',
    'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/838b4051-c130-4aa0-9b0e-488d770d0435/images__1_.png?t=1780886172',
    340,
    'Productivity'
  ),

  -- Finance
  (
    'Betterment',
    'Automated investing and robo-advising.',
    'https://www.betterment.com',
    'https://www.google.com/s2/favicons?sz=128&domain=betterment.com',
    350,
    'Finance'
  ),
  (
    'Monarch Money',
    'All-in-one personal finance tracker.',
    'https://www.monarchmoney.com',
    'https://www.google.com/s2/favicons?sz=128&domain=monarchmoney.com',
    360,
    'Finance'
  )
on conflict (name) do update
set
  subtitle = excluded.subtitle,
  url = excluded.url,
  logo_url = excluded.logo_url,
  sort_order = excluded.sort_order,
  category = excluded.category,
  active = true;
