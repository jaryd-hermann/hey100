-- Owners can remove a group they created. Official stays. Child rows cascade.

drop policy if exists community_groups_delete on public.community_groups;
create policy community_groups_delete
  on public.community_groups for delete
  to authenticated
  using (
    (select auth.uid()) = created_by
    and coalesce(kind, 'community') is distinct from 'official'
  );

grant delete on public.community_groups to authenticated;
