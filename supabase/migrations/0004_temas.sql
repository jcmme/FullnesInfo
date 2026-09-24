-- Tus temas: lo que te interesa, su contenido en caché y la revisión de las notas.

-- Los temas que elegiste, del catálogo o escritos por ti -------------------

create table public.interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  -- 'galeon-de-manila' (catálogo) o 'propio:cafe-de-especialidad' (tuyo).
  key text not null check (char_length(key) between 1 and 120),
  label text not null check (char_length(label) between 1 and 120),
  area text not null default 'propio',
  position int not null default 0,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

create index interests_user_idx on public.interests (user_id, position);

-- Lo que se trae de internet para un tema, guardado para no volver a pedirlo

create table public.topic_cache (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null,
  kind text not null check (kind in ('wiki', 'videos', 'libros')),
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (user_id, key, kind)
);

-- Las notas guardan su revisión y si cuentan para el día -------------------

alter table public.entries
  add column counts boolean not null default true,
  add column review jsonb,
  add column topic_key text;

-- Seguridad: mismo patrón que el resto -------------------------------------

alter table public.interests enable row level security;
alter table public.topic_cache enable row level security;

do $$
declare t text;
begin
  foreach t in array array['interests', 'topic_cache']
  loop
    execute format(
      'create policy "datos propios" on public.%I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end;
$$;

-- Totales por día: una nota marcada como texto al azar deja de sumar -------

create or replace view public.day_totals with (security_invoker = true) as
  select user_id,
         day,
         coalesce(sum(word_count) filter (where counts), 0)::int as words,
         coalesce(max(word_count) filter (where counts), 0)::int as best_words,
         count(*)::int as entries
  from public.entries
  group by user_id, day;
