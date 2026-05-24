create or replace function public.get_email_by_matric_no(p_matric_no text)
returns text
language sql
security definer
set search_path = public
as $$
  select email
  from public.users
  where matric_no = p_matric_no
    and role = 'student';
$$;
