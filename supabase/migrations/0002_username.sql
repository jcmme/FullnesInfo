-- Entrar con nombre de usuario en lugar de correo.
alter table public.profiles
  add column username text unique check (username ~ '^[a-z0-9._-]{3,30}$');
