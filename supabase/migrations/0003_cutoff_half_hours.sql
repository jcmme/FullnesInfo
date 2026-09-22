-- La hora de corte admite medias horas (2.5 = 2:30 AM).
alter table public.profiles
  alter column cutoff_hour type numeric(3,1) using cutoff_hour::numeric,
  alter column cutoff_hour set default 2.5;

alter table public.profiles drop constraint if exists profiles_cutoff_hour_check;
alter table public.profiles
  add constraint profiles_cutoff_hour_check check (cutoff_hour between 0 and 5 and cutoff_hour * 2 = floor(cutoff_hour * 2));

update public.profiles set cutoff_hour = 2.5;
