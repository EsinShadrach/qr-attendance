# AttendanceIQ — Project Specification

## Overview

AttendanceIQ is a QR-code-based attendance tracking web application built for university use. It allows lecturers to generate daily QR codes for their classes, and students to scan those codes to mark their attendance. The project is built as a school defence project.

---

## Tech Stack

| Layer           | Technology                                      |
| --------------- | ----------------------------------------------- |
| Frontend + API  | Next.js (App Router)                            |
| Database + Auth | Supabase (Postgres + RLS)                       |
| QR Generation   | `qrcode` npm package                            |
| QR Scanning     | `html5-qrcode` or similar browser-based scanner |

---

## User Roles

### Lecturer (Admin)

- Logs in with email and password
- Can teach multiple courses
- Manages attendance sessions and views stats

### Student

- Logs in with matric number and password
- Accounts are **pre-seeded** — no self-registration flow
- Can only mark their own attendance by scanning a QR code

---

## Application Flow

### Lecturer Flow

1. Login → redirected to home dashboard
1. Home dashboard shows a grid of all assigned courses (e.g. STAT 212, STAT 321, STAT 101)
1. Click a course → course detail view
1. Inside course view:

- **Generate Attendance QR** for the day — creates a session with a unique UUID token and an expiry timestamp
- **Timetable view** — shows sessions scheduled per day
- **Stats view**:
  - Average number of students attending a class
  - How often a class is attended across the semester

1. Each session shows an attendance list: student name, matric number, time scanned

### Student Flow

1. Login with matric number + password
1. Home screen — option to scan QR code
1. Scan lecturer’s QR code:

- **Valid & active** → attendance marked, confirmation shown
- **Expired** → error: “QR code has expired”
- **Already scanned** → error: “Attendance already recorded”

---

## Database Schema

```sql
-- Users table (both lecturers and students)
users (
  id uuid PRIMARY KEY,
  role text CHECK (role IN ('lecturer', 'student')),
  name text,
  email text,               -- for lecturers
  matric_no text,           -- for students
  password_hash text,
  created_at timestamptz
)

-- Courses
courses (
  id uuid PRIMARY KEY,
  name text,
  code text,                -- e.g. "STAT 321"
  lecturer_id uuid REFERENCES users(id),
  created_at timestamptz
)

-- Student-course enrollment
enrollments (
  id uuid PRIMARY KEY,
  student_id uuid REFERENCES users(id),
  course_id uuid REFERENCES courses(id)
)

-- Attendance sessions (one per class day)
sessions (
  id uuid PRIMARY KEY,
  course_id uuid REFERENCES courses(id),
  date date,
  qr_token uuid UNIQUE,     -- the UUID encoded in the QR code
  expires_at timestamptz,
  created_at timestamptz
)

-- Attendance records
attendance (
  id uuid PRIMARY KEY,
  session_id uuid REFERENCES sessions(id),
  student_id uuid REFERENCES users(id),
  scanned_at timestamptz,
  UNIQUE(session_id, student_id)  -- prevents duplicate scans
)
```

---

## Key Business Logic

### QR Code Generation

- On “Generate QR”, a new `session` row is created with a fresh UUID token and an `expires_at` time (e.g. 15–30 minutes from generation, TBD)
- The UUID is encoded into a QR code rendered on the lecturer’s screen

### QR Code Scanning (Student)

- Student scans QR → app extracts the UUID token
- Backend checks:

1. Does the session exist? → if not, invalid
1. Is `expires_at` in the future? → if not, return “expired”
1. Is there already an attendance record for this student + session? → if yes, return “already recorded”
1. If all pass → insert attendance record → return success

### Stats Aggregation

- **Avg attendance per class**: `COUNT(attendance) / COUNT(sessions)` per course
- **Class attendance frequency**: number of sessions held vs. total scheduled in semester

---

## Row-Level Security (Supabase RLS)

- Lecturers can only read/write courses and sessions they own
- Students can only insert attendance for themselves
- Attendance records are readable by the relevant lecturer only
- Students cannot read other students’ attendance

---

## Pages / Routes

```
/                        → redirect based on role after login
/login                   → shared login, role-based redirect after auth
/lecturer/dashboard      → course grid
/lecturer/courses/[id]   → course detail (QR gen, timetable, attendance list)
/lecturer/courses/[id]/stats → stats view
/student/dashboard       → QR scanner + recent attendance history
```

---

## Out of Scope (for now)

- Student self-registration
- Push notifications
- Mobile app (web only)
- Manual attendance override by lecturer (could be added later)
- Email/SMS reminders
