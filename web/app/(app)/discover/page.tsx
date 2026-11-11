import { Suspense } from 'react';

import { Discover } from '@/components/app/Discover';

export const metadata = { title: 'Discover' };

export default function DiscoverPage() {
  return (
    <Suspense fallback={null}>
      <Discover />
    </Suspense>
  );
}
