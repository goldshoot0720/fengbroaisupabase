-- Fengbro AI Supabase: private-by-default ownership and RLS migration.
-- 1. In Supabase Authentication, create/confirm the owner account.
-- 2. Replace OWNER_USER_UUID below with that user's UUID from auth.users.
-- 3. Run the whole file once in SQL Editor.
-- Existing rows remain inaccessible until the explicit owner assignment succeeds.

begin;

do $$
declare
  owner_uuid uuid := '00000000-0000-0000-0000-000000000000'; -- OWNER_USER_UUID
  table_name text;
  private_tables text[] := array[
    'article', 'bank', 'commonaccount', 'commondocument', 'food', 'image',
    'music', 'podcast', 'routine', 'subscription', 'video', 'push_subscriptions',
    'manualprice', 'landtop_history'
  ];
begin
  if owner_uuid = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Replace OWNER_USER_UUID before running this migration.';
  end if;

  if not exists (select 1 from auth.users where id = owner_uuid) then
    raise exception 'OWNER_USER_UUID does not exist in auth.users.';
  end if;

  foreach table_name in array private_tables loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format('alter table public.%I add column if not exists user_id uuid references auth.users(id) on delete cascade', table_name);
    execute format('update public.%I set user_id = $1 where user_id is null', table_name) using owner_uuid;
    execute format('alter table public.%I alter column user_id set default auth.uid()', table_name);
    execute format('alter table public.%I alter column user_id set not null', table_name);
    execute format('create index if not exists %I on public.%I(user_id)', table_name || '_user_id_idx', table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);

    execute format('drop policy if exists %I on public.%I', table_name || '_owner_select', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_owner_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_owner_update', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_owner_delete', table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_owner_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_owner_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_owner_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_owner_delete', table_name);

    -- Remove common legacy policies that exposed all rows.
    execute format('drop policy if exists "Enable read access for all users" on public.%I', table_name);
    execute format('drop policy if exists "Enable insert access for all users" on public.%I', table_name);
    execute format('drop policy if exists "Enable update access for all users" on public.%I', table_name);
    execute format('drop policy if exists "Enable delete access for all users" on public.%I', table_name);
  end loop;
end $$;

-- Storage must be private. Authenticated access is granted only to the owner account.
-- Existing object paths remain valid to the app after login, but public object URLs must
-- be replaced by signed URLs before changing a production bucket from public to private.
drop policy if exists "Allow public upload on uploads" on storage.objects;
drop policy if exists "Allow public read on uploads" on storage.objects;
drop policy if exists "Allow public update on uploads" on storage.objects;
drop policy if exists "Allow public delete on uploads" on storage.objects;

create policy "Authenticated owner reads uploads"
on storage.objects for select to authenticated
using (bucket_id = 'uploads');

create policy "Authenticated owner uploads uploads"
on storage.objects for insert to authenticated
with check (bucket_id = 'uploads');

create policy "Authenticated owner updates uploads"
on storage.objects for update to authenticated
using (bucket_id = 'uploads') with check (bucket_id = 'uploads');

create policy "Authenticated owner deletes uploads"
on storage.objects for delete to authenticated
using (bucket_id = 'uploads');

commit;
