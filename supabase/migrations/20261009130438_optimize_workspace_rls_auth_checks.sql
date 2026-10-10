-- Keep per-row workspace ownership checks efficient at scale.
drop policy if exists "Users can read own workspace data" on public.user_workspace_data;
create policy "Users can read own workspace data"
  on public.user_workspace_data for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own workspace data" on public.user_workspace_data;
create policy "Users can insert own workspace data"
  on public.user_workspace_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own workspace data" on public.user_workspace_data;
create policy "Users can update own workspace data"
  on public.user_workspace_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
