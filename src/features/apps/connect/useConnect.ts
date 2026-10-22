import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { listConnections } from '@/data/repo/connections';
import { isServerId } from '@/lib/supabase';
import { useStore } from '@/store/AppStore';

/** Keeps the owner screens in step with app_connections. */
export function useConnectionsSync(appId: string | null): void {
  const store = useStore();
  const enabled = !!appId && isServerId(appId);

  const { data } = useQuery({
    queryKey: ['connections', appId],
    enabled,
    queryFn: () => listConnections(appId as string),
  });

  useEffect(() => {
    if (!appId || !data || !Object.keys(data).length) return;
    store.hydrateConnections(appId, data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, data]);
}
