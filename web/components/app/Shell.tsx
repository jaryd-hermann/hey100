'use client';

import { usePathname } from 'next/navigation';

import { FilterProvider } from '@/components/app/Filters';
import { IosProvider } from '@/components/app/IosModal';
import { Nav } from '@/components/app/Nav';
import { ShortcutsMenu, useAppShortcuts } from '@/components/app/Shortcuts';

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const compact = path.startsWith('/chat') || path.startsWith('/community');
  const paywall = path === '/pro';
  const { menu, setMenu } = useAppShortcuts();

  return (
    <IosProvider>
      <FilterProvider>
        <div className={`app-shell${compact ? ' is-compact' : ''}${paywall ? ' is-paywall' : ''}`}>
          <Nav onOpenKeys={() => setMenu(true)} />
          {children}
        </div>
        {menu ? <ShortcutsMenu onClose={() => setMenu(false)} /> : null}
      </FilterProvider>
    </IosProvider>
  );
}
