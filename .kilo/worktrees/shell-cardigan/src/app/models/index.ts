// ===================================================
// TECHWING — ALL APPLICATION MODELS / INTERFACES
// ===================================================

export type UserRole = 'admin' | 'mentor' | 'hod' | 'student';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'na';
export type Session = 'morning' | 'afternoon';
export type Gender = 'male' | 'female' | 'other';
export type CorrectionStatus = 'pending' | 'approved' | 'rejected';


export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------
// BRANCH
// -----------------------------------------------
export interface Branch {
  id: string;
  name: string;           // e.g. "Computer Science Engineering"
  code: string;           // e.g. "CSE"
  hod_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  hod?: HOD;
  student_count?: number;
}

// -----------------------------------------------
// BATCH
// -----------------------------------------------
export interface Batch {
  id: string;
  name: string;           // e.g. "Batch 01"
  branch_id: string;
  mentor_id?: string;
  academic_year: string;  // e.g. "2026-27"
  semester: number;
  year: number;           // 1-4
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  branch?: Branch;
  mentor?: Mentor;
  student_count?: number;
}

// -----------------------------------------------
// MENTOR
// -----------------------------------------------
export interface Mentor {
  id: string;
  user_id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string;
  branch_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  branch?: Branch;
  batches?: Batch[];
}

// -----------------------------------------------
// HOD
// -----------------------------------------------
export interface HOD {
  id: string;
  user_id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string;
  branch_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  branch?: Branch;
}

// -----------------------------------------------
// STUDENT
// -----------------------------------------------
export interface Student {
  id: string;
  user_id?: string;
  student_id: string;       // Auto-generated unique ID
  roll_number: string;
  full_name: string;
  email: string;
  phone?: string;
  gender?: Gender;
  branch_id: string;
  batch_id: string;
  combo_name?: string;      // e.g. "AWS + AGENTIC-AI"
  year: number;
  semester: number;
  mentor_id?: string;
  hod_id?: string;
  profile_photo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  branch?: Branch;
  batch?: Batch;
  mentor?: Mentor;
  hod?: HOD;
  qr_code?: QRCode;
  attendance_summary?: AttendanceSummary;
}

export interface StudentImportRow {
  roll_number: string;
  full_name: string;
  email: string;
  phone?: string;
  gender?: string;
  branch_code: string;
  batch_name: string;
  combo_name?: string;
  year: string | number;
  semester: string | number;
  mentor_employee_id?: string;
  // Validation fields
  _valid?: boolean;
  _errors?: string[];
  _row?: number;
}

// -----------------------------------------------
// QR CODE
// -----------------------------------------------
export interface QRCode {
  id: string;
  student_id: string;
  token: string;            // Secure UUID token (not the student ID directly)
  qr_data_url?: string;     // Base64 rendered QR
  is_active: boolean;
  generated_at: string;
  expires_at?: string;
  created_at: string;
}

// -----------------------------------------------
// ATTENDANCE SESSION
// -----------------------------------------------
export interface AttendanceSession {
  id: string;
  date: string;             // ISO date "YYYY-MM-DD"
  session: Session;
  batch_id: string;
  mentor_id: string;
  start_time: string;       // "HH:mm"
  end_time: string;         // "HH:mm"
  is_open: boolean;
  closed_at?: string;
  created_at: string;
  // Joined
  batch?: Batch;
  mentor?: Mentor;
  stats?: SessionStats;
}

export interface SessionStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

// -----------------------------------------------
// ATTENDANCE RECORD
// -----------------------------------------------
export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  attendance_date: string;
  session: Session;
  status: AttendanceStatus;
  scan_time?: string;
  marked_by?: string;       // mentor user_id
  qr_token_used?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined
  student?: Student;
  attendance_session?: AttendanceSession;
}

// -----------------------------------------------
// ATTENDANCE SUMMARY (computed)
// -----------------------------------------------
export interface AttendanceSummary {
  student_id: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  percentage: number;
  current_streak: number;
  longest_streak: number;
  month?: string;
  year?: number;
}

export interface DailyAttendance {
  date: string;
  morning: AttendanceStatus | null;
  afternoon: AttendanceStatus | null;
  final_status: AttendanceStatus;
}

// -----------------------------------------------
// ATTENDANCE CORRECTION
// -----------------------------------------------
export interface AttendanceCorrection {
  id: string;
  attendance_record_id: string;
  student_id: string;
  requested_by: string;       // mentor user_id
  approved_by?: string;       // admin/hod user_id
  original_status: AttendanceStatus;
  requested_status: AttendanceStatus;
  reason: string;
  status: CorrectionStatus;
  admin_notes?: string;
  requested_at: string;
  resolved_at?: string;
  // Joined
  student?: Student;
  attendance_record?: AttendanceRecord;
  requester?: Profile;
  approver?: Profile;
}

// -----------------------------------------------
// ATTENDANCE ARCHIVE
// -----------------------------------------------
export interface AttendanceArchive {
  id: string;
  period_label: string;       // "September 2026"
  month: number;              // 1–12
  year: number;
  branch_id?: string;
  batch_id?: string;
  archived_at: string;
  file_url?: string;          // Supabase Storage URL
  google_sheet_url?: string;
  stats: {
    total_students: number;
    total_working_days: number;
    avg_attendance_percentage: number;
    branch_summaries: BranchSummary[];
    batch_summaries: BatchSummary[];
  };
  created_at: string;
}

export interface BranchSummary {
  branch_id: string;
  branch_name: string;
  branch_code: string;
  total_students: number;
  avg_percentage: number;
}

export interface BatchSummary {
  batch_id: string;
  batch_name: string;
  branch_code: string;
  total_students: number;
  avg_percentage: number;
}

// -----------------------------------------------
// NOTIFICATIONS
// -----------------------------------------------
export type NotificationType =
  | 'attendance_marked'
  | 'correction_approved'
  | 'correction_rejected'
  | 'low_attendance'
  | 'monthly_report'
  | 'import_complete'
  | 'import_failed'
  | 'session_opened'
  | 'session_closed';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

// -----------------------------------------------
// AUDIT LOG
// -----------------------------------------------
export type AuditAction =
  | 'student_created' | 'student_updated' | 'student_deleted'
  | 'attendance_marked' | 'attendance_corrected'
  | 'qr_generated' | 'qr_regenerated'
  | 'excel_imported' | 'report_exported'
  | 'archive_created' | 'user_login' | 'user_logout'
  | 'session_opened' | 'session_closed'
  | 'settings_updated';

export interface AuditLog {
  id: string;
  user_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  // Joined
  user?: Profile;
}

// -----------------------------------------------
// SYSTEM SETTINGS
// -----------------------------------------------
export interface SystemSettings {
  id: string;
  college_name: string;
  logo_url?: string;
  primary_color: string;
  attendance_threshold: number;   // default 75
  morning_start: string;          // "08:00"
  morning_end: string;            // "11:00"
  afternoon_start: string;        // "13:00"
  afternoon_end: string;          // "15:00"
  timezone: string;               // "Asia/Kolkata"
  email_notifications_enabled: boolean;
  google_sheets_enabled: boolean;
  dark_mode_default: boolean;
  updated_at: string;
}

// -----------------------------------------------
// GOOGLE SHEETS INTEGRATION
// -----------------------------------------------
export interface GoogleSheetIntegration {
  id: string;
  spreadsheet_id: string;
  spreadsheet_name: string;
  last_synced_at?: string;
  is_active: boolean;
  auto_sync: boolean;
  created_at: string;
}

// -----------------------------------------------
// DASHBOARD STATS
// -----------------------------------------------
export interface DashboardStats {
  total_students: number;
  present_today: number;
  absent_today: number;
  attendance_percentage: number;
  total_branches: number;
  total_batches: number;
  low_attendance_count: number;
  morning_session_open: boolean;
  afternoon_session_open: boolean;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
  }[];
}

// -----------------------------------------------
// API RESPONSE WRAPPERS
// -----------------------------------------------
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface QueryOptions {
  page?: number;
  per_page?: number;
  search?: string;
  branch_id?: string;
  batch_id?: string;
  mentor_id?: string;
  hod_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  month?: number;
  year?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// -----------------------------------------------
// QR DESIGNER
// -----------------------------------------------
export interface QRDesignTemplate {
  id: string;
  name: string;
  background_image_url?: string;
  background_color: string;
  text_color: string;
  logo_url?: string;
  qr_position: { x: number; y: number; width: number; height: number };
  fields: {
    show_name: boolean;
    show_roll_number: boolean;
    show_branch: boolean;
    show_batch: boolean;
    show_combo_name: boolean;
    show_year: boolean;
    show_college_name: boolean;
    show_photo: boolean;
  };
  font_size: number;
  is_default: boolean;
  created_at: string;
}

// -----------------------------------------------
// IMPORT / EXPORT
// -----------------------------------------------
export interface ImportResult {
  total: number;
  valid: number;
  duplicates: number;
  invalid: number;
  imported: number;
  errors: { row: number; field: string; message: string }[];
}

export interface ExportConfig {
  format: 'csv' | 'xlsx';
  type: 'students' | 'daily' | 'monthly' | 'branch' | 'batch' | 'student_personal';
  filters?: QueryOptions;
}
