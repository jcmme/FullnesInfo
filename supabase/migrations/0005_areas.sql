-- Eliges áreas; los temas específicos llegan solos.

alter table public.profiles add column areas text[] not null default '{}';

alter table public.interests
  add column status text not null default 'guardado' check (status in ('guardado', 'descartado'));
