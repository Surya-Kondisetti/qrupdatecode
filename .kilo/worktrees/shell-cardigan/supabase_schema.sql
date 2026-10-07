-- ====================================================================
-- TECHWING STUDENT ATTENDANCE SYSTEM - SUPABASE SQL INITIALIZATION SCRIPT
-- Copy and paste this ENTIRE script into your Supabase SQL Editor
-- (Dashboard -> SQL Editor -> New Query -> Run)
-- ====================================================================

-- 1. Create PROFILES table
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  must_change_password BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create BRANCHES table
CREATE TABLE IF NOT EXISTS public.branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  hod_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create HODS table
CREATE TABLE IF NOT EXISTS public.hods (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  employee_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  branch_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create MENTORS table
CREATE TABLE IF NOT EXISTS public.mentors (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  employee_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  branch_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create BATCHES table
CREATE TABLE IF NOT EXISTS public.batches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  branch_id TEXT,
  mentor_id TEXT,
  academic_year TEXT DEFAULT '2026-27',
  semester INT DEFAULT 1,
  year INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create STUDENTS table
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  student_id TEXT UNIQUE,
  roll_number TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  gender TEXT DEFAULT 'male',
  branch_id TEXT,
  batch_id TEXT,
  combo_name TEXT DEFAULT 'AWS + AGENTIC-AI',
  year INT DEFAULT 1,
  semester INT DEFAULT 1,
  mentor_id TEXT,
  hod_id TEXT,
  profile_photo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create QR_CODES table
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id TEXT PRIMARY KEY,
  student_id TEXT UNIQUE,
  token TEXT UNIQUE,
  qr_data_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create ATTENDANCE table
CREATE TABLE IF NOT EXISTS public.attendance (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  session_id TEXT,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session TEXT NOT NULL DEFAULT 'morning',
  status TEXT NOT NULL DEFAULT 'absent',
  scan_time TIMESTAMPTZ,
  marked_by TEXT,
  qr_token_used TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, attendance_date, session)
);

-- Create alias view for attendance_records
CREATE OR REPLACE VIEW public.attendance_records AS SELECT * FROM public.attendance;

-- 9. Create ATTENDANCE_CORRECTIONS table
CREATE TABLE IF NOT EXISTS public.attendance_corrections (
  id TEXT PRIMARY KEY,
  attendance_record_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  requested_by TEXT,
  approved_by TEXT,
  original_status TEXT NOT NULL,
  requested_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 10. INSERT DEFAULT BRANCHES DATA
INSERT INTO public.branches (id, name, code, is_active) VALUES
  ('br-1', 'Computer Science & Engineering', 'CSE', true),
  ('br-2', 'Electronics & Communication Eng.', 'ECE', true),
  ('br-3', 'Electrical & Electronics Eng.', 'EEE', true),
  ('br-4', 'Mechanical Engineering', 'MECH', true),
  ('br-5', 'Civil Engineering', 'CIVIL', true),
  ('br-6', 'Information Technology', 'IT', true)
ON CONFLICT (id) DO NOTHING;

-- 11. INSERT DEFAULT BATCHES DATA
INSERT INTO public.batches (id, name, branch_id, academic_year, semester, year, is_active) VALUES
  ('bt-1', 'Batch 01', 'br-1', '2026-27', 1, 1, true),
  ('bt-2', 'Batch 02', 'br-1', '2026-27', 3, 2, true),
  ('bt-3', 'Batch 03', 'br-2', '2026-27', 5, 3, true)
ON CONFLICT (id) DO NOTHING;

-- 12. DISABLE RLS or ALLOW FULL ACCESS FOR CLIENT OPERATIONS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hods DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections DISABLE ROW LEVEL SECURITY;
