-- Seed auth.users with all token columns set to '' (not NULL)
-- GoTrue's Go scanner crashes on NULL columns (confirmation_token, recovery_token, etc.)
-- so we must use empty strings instead.

-- Lecturer
insert into auth.users (id, instance_id, email, encrypted_password,
  email_confirmed_at, confirmation_sent_at, confirmation_token,
  recovery_token, email_change, email_change_token_new, email_change_token_current,
  reauthentication_token, phone_change_token,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role,
  is_sso_user, is_anonymous)
values (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'lecturer@university.edu',
  crypt('password123', gen_salt('bf', 10)),
  now(), now(), encode(gen_random_bytes(28), 'hex'),
  '', '', '', '',
  '', '',
  now(), now(),
  '{"provider":"email","providers":["email"],"app_role":"lecturer"}',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'email', 'lecturer@university.edu',
    'email_verified', false, 'phone_verified', false),
  'authenticated', 'authenticated',
  false, false
);

-- Identity: provider_id must be the USER UUID, not the email
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'email', 'lecturer@university.edu',
    'email_verified', false, 'phone_verified', false),
  'email', now(), now(), now()
);

-- Student
insert into auth.users (id, instance_id, email, encrypted_password,
  email_confirmed_at, confirmation_sent_at, confirmation_token,
  recovery_token, email_change, email_change_token_new, email_change_token_current,
  reauthentication_token, phone_change_token,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role,
  is_sso_user, is_anonymous)
values (
  'b0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'student@university.edu',
  crypt('password123', gen_salt('bf', 10)),
  now(), now(), encode(gen_random_bytes(28), 'hex'),
  '', '', '', '',
  '', '',
  now(), now(),
  '{"provider":"email","providers":["email"],"app_role":"student"}',
  jsonb_build_object('sub', 'b0000000-0000-0000-0000-000000000001', 'email', 'student@university.edu',
    'email_verified', false, 'phone_verified', false),
  'authenticated', 'authenticated',
  false, false
);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  'b0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  jsonb_build_object('sub', 'b0000000-0000-0000-0000-000000000001', 'email', 'student@university.edu',
    'email_verified', false, 'phone_verified', false),
  'email', now(), now(), now()
);

-- Update the auto-created public.users profiles
update public.users set name = 'Dr. Smith' where email = 'lecturer@university.edu';
update public.users set role = 'student', name = 'Alice Johnson', matric_no = 'NOU223094976'
  where email = 'student@university.edu';

-- Seed a course for the lecturer
insert into public.courses (id, name, code, lecturer_id)
values (
  'c0000000-0000-0000-0000-000000000001',
  'Introduction to Statistics',
  'STAT 321',
  'a0000000-0000-0000-0000-000000000001'
);

-- Enroll the student
insert into public.enrollments (student_id, course_id)
values (
  'b0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001'
);
