-- Optional local seed. Demo auth users are created by scripts/bootstrap-users.mjs
-- (Management/Auth Admin API). This file is safe to re-run for config only.

insert into public.app_settings (id) values ('default')
on conflict (id) do nothing;
