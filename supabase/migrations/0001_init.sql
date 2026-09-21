-- FullnesInfo: esquema inicial.
-- Ejecutar completo en Supabase > SQL Editor.

-- Perfil y reglas del juego ------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  timezone text not null default 'America/Mexico_City',
  cutoff_hour int not null default 1 check (cutoff_hour between 0 and 6),
  min_words int not null default 50 check (min_words between 10 and 500),
  freezes_per_month int not null default 1 check (freezes_per_month between 0 and 5),
  start_day date not null default ((now() at time zone 'America/Mexico_City') - interval '1 hour')::date,
  evaluated_through date,
  api_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Biblioteca de guardados ---------------------------------------------------

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  kind text not null default 'video'
    check (kind in ('video', 'podcast', 'libro', 'curso', 'articulo', 'documento', 'hilo', 'otro')),
  origin text check (origin in ('instagram', 'tiktok', 'youtube', 'threads', 'x', 'web', 'otro')),
  origin_url text,
  status text not null default 'pendiente'
    check (status in ('por_vincular', 'pendiente', 'en_curso', 'terminado')),
  media_provider text check (media_provider in ('youtube', 'openlibrary', 'itunes', 'manual')),
  media_id text,
  media_title text,
  media_author text,
  media_url text,
  thumbnail_url text,
  duration_seconds int,
  total_pages int,
  chapters jsonb not null default '[]',
  candidates jsonb not null default '[]',
  progress_seconds int not null default 0,
  progress_pages int not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create index items_user_status_idx on public.items (user_id, status, updated_at desc);

-- Caja misteriosa -----------------------------------------------------------

create table public.mystery_opens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  topic_id text not null,
  rarity text not null check (rarity in ('comun', 'rara', 'legendaria')),
  day date not null,
  status text not null default 'abierta' check (status in ('abierta', 'investigada')),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

-- Registro diario -----------------------------------------------------------

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  item_id uuid references public.items on delete set null,
  mystery_id uuid references public.mystery_opens on delete set null,
  kind text not null,
  title text not null check (char_length(title) between 1 and 300),
  note text not null,
  word_count int not null,
  minutes int check (minutes between 0 and 1440),
  created_at timestamptz not null default now()
);

create index entries_user_day_idx on public.entries (user_id, day);

-- Fallos, comodines y castigos ----------------------------------------------

create table public.failures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  level int not null check (level between 1 and 4),
  status text not null default 'pendiente' check (status in ('pendiente', 'castigo', 'perdonado')),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create table public.freezes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create table public.punishments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  failure_id uuid references public.failures on delete set null,
  parent_id uuid references public.punishments on delete set null,
  challenge_id text not null,
  kind text not null check (kind in ('ventana', 'dias')),
  title text not null,
  level int not null check (level between 1 and 4),
  target numeric not null check (target > 0),
  unit text not null check (unit in ('reps', 'seg', 'km')),
  window_hours numeric,
  days int,
  status text not null default 'asignado' check (status in ('asignado', 'en_curso', 'cumplido', 'vencido')),
  progress numeric not null default 0,
  start_by timestamptz not null,
  started_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index punishments_user_status_idx on public.punishments (user_id, status);

create table public.punishment_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  punishment_id uuid not null references public.punishments on delete cascade,
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index punishment_logs_punishment_idx on public.punishment_logs (punishment_id);

-- Seguridad: cada quien solo ve lo suyo ------------------------------------

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.mystery_opens enable row level security;
alter table public.entries enable row level security;
alter table public.failures enable row level security;
alter table public.freezes enable row level security;
alter table public.punishments enable row level security;
alter table public.punishment_logs enable row level security;

create policy "perfil propio: leer" on public.profiles
  for select using (id = (select auth.uid()));
create policy "perfil propio: editar" on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['items', 'mystery_opens', 'entries', 'failures', 'freezes', 'punishments', 'punishment_logs']
  loop
    execute format(
      'create policy "datos propios" on public.%I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end;
$$;

-- Totales por día (respeta RLS del usuario que consulta) --------------------

create view public.day_totals with (security_invoker = true) as
  select user_id, day, sum(word_count)::int as words, max(word_count)::int as best_words, count(*)::int as entries
  from public.entries
  group by user_id, day;
