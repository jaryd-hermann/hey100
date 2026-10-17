import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { PROMPT_LIBRARY } from '@/data/prompts';
import type { Prompt, PromptTag } from '@/data/types';
import { getSupabase } from '@/lib/supabase';

import { queryKeys, staleTimes } from './keys';

async function fetchPrompts(): Promise<Prompt[]> {
  const db = getSupabase();
  if (!db) return PROMPT_LIBRARY;

  const { data, error } = await db
    .from('prompts')
    .select('id, tag, label')
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return data.map((row) => ({ id: row.id, tag: row.tag as PromptTag, label: row.label }));
}

/**
 * The bundled library seeds the cache, so the picker renders on first frame and
 * still works with no network; the server copy replaces it once it lands.
 */
export function usePromptLibrary(): Prompt[] {
  const { data } = useQuery({
    queryKey: queryKeys.prompts,
    queryFn: fetchPrompts,
    initialData: PROMPT_LIBRARY,
    staleTime: staleTimes.prompts,
  });

  return data;
}

/** Resolves a stored prompt id to the label shown above an answer. */
export function usePromptLabel(): (promptId: string) => string {
  const prompts = usePromptLibrary();

  return useCallback(
    (promptId: string) => prompts.find((prompt) => prompt.id === promptId)?.label ?? '',
    [prompts],
  );
}
