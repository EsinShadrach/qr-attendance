-- Profiles table (links Supabase Auth to app user data)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('lecturer', 'student')),
  name text not null,
  email text,               -- lecturers only
  matric_no text unique,    -- students only
  created_at timestamptz not null default now()
);

-- Courses
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,                -- e.g. "STAT 321"
  lecturer_id uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

-- Student-course enrollment
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id),
  course_id uuid not null references public.courses(id) on delete cascade,
  unique(student_id, course_id)
);

-- Attendance sessions (one per class day)
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  date date not null default current_date,
  qr_token uuid not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Attendance records
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.users(id),
  scanned_at timestamptz not null default now(),
  unique(session_id, student_id)
);

-- Indexes
create index idx_courses_lecturer on public.courses(lecturer_id);
create index idx_enrollments_student on public.enrollments(student_id);
create index idx_enrollments_course on public.enrollments(course_id);
create index idx_sessions_course on public.sessions(course_id);
create index idx_sessions_qr_token on public.sessions(qr_token);
create index idx_attendance_session on public.attendance(session_id);
create index idx_attendance_student on public.attendance(student_id);

-- Auto-create public user profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, role, name, email)
  values (
    new.id,
    'lecturer',
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: check lecturer role via JWT (fallback to SECURITY DEFINER table lookup)
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_lecturer()
returns boolean
language sql
stable
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'app_role',
    public.get_user_role()
  ) = 'lecturer';
$$;

-- SECURITY DEFINER helper: check that the current user is the lecturer of a course
-- Bypasses RLS on courses, breaking the courses↔enrollments policy cycle.
create or replace function public.lecturer_owns_course(course_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.courses
    where id = course_id and lecturer_id = auth.uid()
  );
$$;

-- RLS: enable row-level security
alter table public.users enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.sessions enable row level security;
alter table public.attendance enable row level security;

-- Users: can read own profile; lecturers can read all (needed for course lists)
create policy "Users read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Lecturers read all users"
  on public.users for select
  using (public.is_lecturer());

-- Courses: lecturers manage their own; students read enrolled
create policy "Lecturers select own courses"
  on public.courses for select
  using (lecturer_id = auth.uid());

create policy "Lecturers insert own courses"
  on public.courses for insert
  with check (lecturer_id = auth.uid());

create policy "Lecturers update own courses"
  on public.courses for update
  using (lecturer_id = auth.uid());

create policy "Lecturers delete own courses"
  on public.courses for delete
  using (lecturer_id = auth.uid());

create policy "Students view enrolled courses"
  on public.courses for select
  using (
    not public.is_lecturer() and exists (
      select 1 from public.enrollments
      where course_id = courses.id and student_id = auth.uid()
    )
  );

-- Enrollments: lecturers use SECURITY DEFINER helper to avoid cycles
create policy "Lecturers select enrollments"
  on public.enrollments for select
  using (public.is_lecturer() and public.lecturer_owns_course(course_id));

create policy "Lecturers insert enrollments"
  on public.enrollments for insert
  with check (public.is_lecturer() and public.lecturer_owns_course(course_id));

create policy "Lecturers update enrollments"
  on public.enrollments for update
  using (public.is_lecturer() and public.lecturer_owns_course(course_id));

create policy "Lecturers delete enrollments"
  on public.enrollments for delete
  using (public.is_lecturer() and public.lecturer_owns_course(course_id));

create policy "Students read own enrollments"
  on public.enrollments for select
  using (not public.is_lecturer() and student_id = auth.uid());

-- Sessions: lecturers use SECURITY DEFINER helper; students read enrolled
create policy "Lecturers select sessions"
  on public.sessions for select
  using (public.is_lecturer() and public.lecturer_owns_course(course_id));

create policy "Lecturers insert sessions"
  on public.sessions for insert
  with check (public.is_lecturer() and public.lecturer_owns_course(course_id));

create policy "Lecturers update sessions"
  on public.sessions for update
  using (public.is_lecturer() and public.lecturer_owns_course(course_id));

create policy "Lecturers delete sessions"
  on public.sessions for delete
  using (public.is_lecturer() and public.lecturer_owns_course(course_id));

create policy "Students read sessions for enrolled courses"
  on public.sessions for select
  using (
    not public.is_lecturer() and exists (
      select 1 from public.enrollments
      where course_id = sessions.course_id and student_id = auth.uid()
    )
  );

-- Attendance: students insert own; lecturers read for their sessions
create policy "Students insert own attendance"
  on public.attendance for insert
  with check (not public.is_lecturer() and student_id = auth.uid());

create policy "Students read own attendance"
  on public.attendance for select
  using (not public.is_lecturer() and student_id = auth.uid());

create policy "Lecturers read attendance for their sessions"
  on public.attendance for select
  using (
    public.is_lecturer() and exists (
      select 1 from public.sessions
      where id = attendance.session_id and public.lecturer_owns_course(course_id)
    )
  );
