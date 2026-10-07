import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import { StudentService } from './student.service';
import {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  Session,
  AttendanceSummary,
  DailyAttendance,
  AttendanceCorrection,
  DashboardStats,
  QueryOptions,
  CorrectionStatus
} from '../../models';

import { NotificationService } from './notification.service';
import { SmsService } from './sms.service';
import { EmailService } from './email.service';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private _records$ = new BehaviorSubject<AttendanceRecord[]>([]);
  public records$ = this._records$.asObservable();

  private _sessions$ = new BehaviorSubject<AttendanceSession[]>([]);
  public sessions$ = this._sessions$.asObservable();

  private _corrections$ = new BehaviorSubject<AttendanceCorrection[]>([]);
  public corrections$ = this._corrections$.asObservable();

  constructor(
    private supabase: SupabaseService,
    private studentService: StudentService,
    private notificationService: NotificationService,
    private smsService: SmsService,
    private emailService: EmailService
  ) {
    this.initAttendanceData();
  }

  public async initAttendanceData(): Promise<void> {
    this._records$.next([]);
    this._corrections$.next([]);

    if (this.supabase.isConfigured) {
      try {
        const [attRes, corrRes] = await Promise.all([
          this.supabase.from('attendance').select('*').order('attendance_date', { ascending: false }),
          this.supabase.from('attendance_corrections').select('*').order('requested_at', { ascending: false })
        ]);

        if (attRes.data && attRes.data.length > 0) {
          const records = (attRes.data as any[]).map(r => {
            const fullStud = this.studentService.getStudentById(r.student_id) || r.student;
            return {
              ...r,
              student: fullStud
            } as AttendanceRecord;
          });
          this._records$.next(records);
        }
        if (corrRes.data && corrRes.data.length > 0) {
          const corrections = (corrRes.data as any[]).map(c => {
            const fullStud = this.studentService.getStudentById(c.student_id) || c.student;
            return {
              ...c,
              student: fullStud
            } as AttendanceCorrection;
          });
          this._corrections$.next(corrections);
        }
      } catch (e) {
        console.warn('Supabase attendance load error:', e);
      }
    }
  }

  getRecords(options?: QueryOptions): AttendanceRecord[] {
    let list = [...this._records$.value];

    if (!options) return list;

    if (options.branch_id) {
      list = list.filter(r => r.student?.branch_id === options.branch_id);
    }
    if (options.batch_id) {
      list = list.filter(r => r.student?.batch_id === options.batch_id);
    }
    if (options.status) {
      list = list.filter(r => r.status === options.status);
    }
    if (options.from_date) {
      list = list.filter(r => r.attendance_date >= options.from_date!);
    }
    if (options.to_date) {
      list = list.filter(r => r.attendance_date <= options.to_date!);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      list = list.filter(r =>
        r.student?.full_name.toLowerCase().includes(q) ||
        r.student?.roll_number.toLowerCase().includes(q)
      );
    }

    return list;
  }

  markAttendanceByQR(token: string, session: Session = 'morning'): { success: boolean; student?: any; message: string } {
    const rawInput = token ? token.trim() : '';

    // 1. Strict Security Signature Check: Reject any external/unauthorized QR code
    if (!rawInput.includes('TWSEC-OFFICIAL-2026::')) {
      return {
        success: false,
        message: '⛔ INVALID & UNAUTHORIZED QR CODE! This QR code was generated outside or lacks the official Admin Secret Signature. Only Admin-generated official QR passes can be scanned.'
      };
    }

    const student = this.studentService.getStudentByQRToken(rawInput);

    if (!student) {
      return { success: false, message: '❌ Invalid Student QR Code! Secret signature verified, but no active student record matched this token.' };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const records = [...this._records$.value];

    const existing = records.find(r =>
      r.student_id === student.id &&
      r.attendance_date === todayStr &&
      r.session === session
    );

    if (existing && existing.status === 'present') {
      return {
        success: false,
        student,
        message: `Attendance already recorded for ${student.full_name} (${student.roll_number}) in ${session} session.`
      };
    }

    const newRecord: AttendanceRecord = {
      id: `rec-scan-${Date.now()}`,
      student_id: student.id,
      session_id: `sess-${session}-${todayStr}`,
      attendance_date: todayStr,
      session,
      status: 'present',
      scan_time: new Date().toISOString(),
      marked_by: 'current-mentor-id',
      qr_token_used: token,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      student
    };

    if (existing) {
      const idx = records.indexOf(existing);
      records[idx] = newRecord;
    } else {
      records.unshift(newRecord);
    }

    this._records$.next(records);

    // Sync marked attendance directly with Supabase
    if (this.supabase.isConfigured) {
      this.supabase.from('attendance').upsert({
        id: newRecord.id,
        student_id: student.id,
        session_id: `sess-${session}-${todayStr}`,
        attendance_date: todayStr,
        session,
        status: 'present',
        scan_time: newRecord.scan_time,
        marked_by: 'current-mentor-id',
        created_at: newRecord.created_at,
        updated_at: newRecord.updated_at
      }).then(({ error }) => {
        if (error) console.warn('Supabase attendance sync error:', error.message || error);
      });
    }

    this.notificationService.addNotification(
      'attendance_marked',
      'Attendance Verified',
      `Present verification recorded for ${student.full_name} (${student.roll_number}) [${session.toUpperCase()}]`
    );

    return {
      success: true,
      student,
      message: `✓ Attendance Marked: ${student.full_name} (${student.roll_number}) - ${session.toUpperCase()} Session`
    };
  }

  closeSessionAndMarkAbsentees(session: Session = 'morning'): { absenteesMarked: number } {
    const todayStr = new Date().toISOString().split('T')[0];
    const students = this.studentService.getStudents();
    const records = [...this._records$.value];
    const dbAbsentees: any[] = [];

    let absenteesCount = 0;

    students.forEach(stud => {
      const existing = records.find(r =>
        r.student_id === stud.id &&
        r.attendance_date === todayStr &&
        r.session === session
      );

      if (!existing || existing.status === 'absent') {
        absenteesCount++;
        const recId = existing ? existing.id : `rec-abs-${session}-${todayStr}-${stud.id}`;
        const absentRecord: AttendanceRecord = {
          id: recId,
          student_id: stud.id,
          session_id: `sess-${session}-${todayStr}`,
          attendance_date: todayStr,
          session,
          status: 'absent',
          scan_time: undefined,
          marked_by: 'system-auto-close',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          student: stud
        };

        dbAbsentees.push({
          id: recId,
          student_id: stud.id,
          session_id: `sess-${session}-${todayStr}`,
          attendance_date: todayStr,
          session,
          status: 'absent',
          marked_by: 'system-auto-close',
          created_at: absentRecord.created_at,
          updated_at: absentRecord.updated_at
        });

        if (existing) {
          const idx = records.indexOf(existing);
          records[idx] = absentRecord;
        } else {
          records.push(absentRecord);
        }
      }
    });

    this._records$.next(records);

    if (this.supabase.isConfigured && dbAbsentees.length > 0) {
      this.supabase.from('attendance').upsert(dbAbsentees).then(({ error }) => {
        if (error) console.warn('Supabase absentee sync error:', error.message || error);
      });
    }

    // 1. Send In-App Database Notifications to each student
    if (absenteesCount > 0) {
      students.forEach(stud => {
        const isAbsent = records.some(r =>
          r.student_id === stud.id &&
          r.attendance_date === todayStr &&
          r.session === session &&
          r.status === 'absent'
        );
        if (isAbsent) {
          this.notificationService.addNotification(
            'absent_alert',
            '⚠️ Marked ABSENT Notification',
            `Notice: You were marked ABSENT for ${session.toUpperCase()} session on ${todayStr}. Please review your attendance record.`,
            '/student/dashboard',
            stud.user_id || stud.id
          );
        }
      });
    }

    // 2. Send Direct Email Absent Alerts to all students
    if (absenteesCount > 0) {
      const absenteesWithEmail = students
        .filter(s => {
          const rec = records.find(r =>
            r.student_id === s.id &&
            r.attendance_date === todayStr &&
            r.session === session &&
            r.status === 'absent'
          );
          return rec && s.email;
        })
        .map(s => ({
          id: s.id,
          full_name: s.full_name,
          roll_number: s.roll_number,
          email: s.email
        }));

      if (absenteesWithEmail.length > 0) {
        this.emailService.sendBulkAbsentEmails(
          absenteesWithEmail,
          session,
          todayStr
        ).then(emailResults => {
          const sent = emailResults.filter(r => r.success).length;
          console.log(`[Direct Email] Sent ${sent} absent alert emails to student database addresses.`);
        });
      }
    }

    // 3. Send SMS absent alerts to all students with a registered phone number
    if (absenteesCount > 0) {
      const absenteesWithPhone = students
        .filter(s => {
          const rec = records.find(r =>
            r.student_id === s.id &&
            r.attendance_date === todayStr &&
            r.session === session &&
            r.status === 'absent'
          );
          return rec && s.phone;
        })
        .map(s => ({
          id: s.id,
          full_name: s.full_name,
          roll_number: s.roll_number,
          phone: s.phone
        }));

      if (absenteesWithPhone.length > 0) {
        this.smsService.sendBulkAbsentAlerts(
          absenteesWithPhone,
          session,
          todayStr
        ).then(results => {
          const sent = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success && r.phone !== 'N/A').length;
          console.log(`[SMS] Absent alerts: ${sent} sent, ${failed} failed, ${results.length - sent - failed} skipped (no phone)`);
        });
      }
    }

    return { absenteesMarked: absenteesCount };
  }

  getStudentDailyList(studentId: string, month?: number, year?: number): DailyAttendance[] {
    try {
      const records = (this._records$.value || []).filter(r => r && r.student_id === studentId);
      const map = new Map<string, DailyAttendance>();

      // Process all explicit records
      records.forEach(r => {
        if (!r || !r.attendance_date) return;
        const d = String(r.attendance_date);
        if (!map.has(d)) {
          map.set(d, { date: d, morning: 'absent', afternoon: 'absent', final_status: 'absent' });
        }
        const item = map.get(d)!;
        if (r.session === 'morning') item.morning = r.status;
        if (r.session === 'afternoon') item.afternoon = r.status;
      });

      // If month and year specified, ensure all calendar days of that month exist.
      // If QR was not scanned for any date/session, it automatically defaults to ABSENT!
      if (month && year) {
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
          const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          if (!map.has(dayStr)) {
            map.set(dayStr, {
              date: dayStr,
              morning: 'absent',
              afternoon: 'absent',
              final_status: 'absent'
            });
          }
        }
      }

      // Calculate final status for each day (If unscanned in both sessions -> ABSENT)
      const list = Array.from(map.values()).map(item => {
        const morning = item.morning || 'absent';
        const afternoon = item.afternoon || 'absent';
        let final_status: AttendanceStatus = 'absent';

        if (morning === 'present' || afternoon === 'present') {
          final_status = 'present';
        } else if (morning === 'late' || afternoon === 'late') {
          final_status = 'late';
        } else {
          final_status = 'absent';
        }

        return {
          date: item.date,
          morning,
          afternoon,
          final_status
        };
      });

      let filtered = list.sort((a, b) => b.date.localeCompare(a.date));

      if (month && year) {
        filtered = filtered.filter(item => {
          const parts = item.date.split('-');
          return Number(parts[0]) === year && Number(parts[1]) === month;
        });
      }

      return filtered;
    } catch (e) {
      return [];
    }
  }

  getStudentSummary(studentId: string, month?: number, year?: number): AttendanceSummary {
    try {
      const dailyList = this.getStudentDailyList(studentId, month, year);
      const totalDays = dailyList.length > 0 ? dailyList.length : 1;
      
      const presentDays = dailyList.filter(d => d.final_status === 'present').length;
      const lateDays = dailyList.filter(d => d.final_status === 'late').length;
      const absentDays = dailyList.filter(d => d.final_status === 'absent').length;

      const percentage = Math.round(((presentDays + lateDays) / totalDays) * 100);

      let streak = 0;
      let maxStreak = 0;
      for (const rec of dailyList) {
        if (rec.final_status === 'present' || rec.final_status === 'late') {
          streak++;
          if (streak > maxStreak) maxStreak = streak;
        } else {
          break;
        }
      }

      return {
        student_id: studentId,
        total_days: totalDays,
        present_days: presentDays,
        absent_days: absentDays,
        late_days: lateDays,
        percentage,
        current_streak: streak,
        longest_streak: maxStreak,
        month: month ? String(month) : undefined,
        year: year ? year : undefined
      };
    } catch (e) {
      return {
        student_id: studentId,
        total_days: 0,
        present_days: 0,
        absent_days: 0,
        late_days: 0,
        percentage: 100,
        current_streak: 0,
        longest_streak: 0
      };
    }
  }

  getDashboardStats(): DashboardStats {
    try {
      const students = this.studentService.getStudents() || [];
      const todayStr = new Date().toISOString().split('T')[0];
      const records = this._records$.value || [];
      const todayRecords = records.filter(r => r && String(r.attendance_date) === todayStr);

      const presentToday = todayRecords.filter(r => r && r.status === 'present').length;
      const absentToday = Math.max(0, students.length - presentToday);
      const totalStudents = students.length;
      const percentage = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0;

      let lowCount = 0;
      students.forEach(s => {
        if (s && s.id) {
          const sum = this.getStudentSummary(s.id);
          if (sum.percentage < 75) lowCount++;
        }
      });

      return {
        total_students: totalStudents,
        present_today: presentToday,
        absent_today: absentToday,
        attendance_percentage: percentage,
        total_branches: 6,
        total_batches: 4,
        low_attendance_count: lowCount,
        morning_session_open: true,
        afternoon_session_open: false
      };
    } catch (err) {
      console.warn('Dashboard stats fallback:', err);
      return {
        total_students: 0,
        present_today: 0,
        absent_today: 0,
        attendance_percentage: 0,
        total_branches: 6,
        total_batches: 4,
        low_attendance_count: 0,
        morning_session_open: true,
        afternoon_session_open: false
      };
    }
  }

  requestCorrection(recordId: string, studentId: string, reqStatus: AttendanceStatus, reason: string): void {
    const current = this._corrections$.value;
    const rec = this._records$.value.find(r => r.id === recordId);

    const newCorr: AttendanceCorrection = {
      id: `corr-${Date.now()}`,
      attendance_record_id: recordId,
      student_id: studentId,
      requested_by: 'current-mentor-id',
      original_status: rec?.status || 'absent',
      requested_status: reqStatus,
      reason,
      status: 'pending',
      requested_at: new Date().toISOString(),
      student: rec?.student
    };

    this._corrections$.next([newCorr, ...current]);

    if (this.supabase.isConfigured) {
      const { student: _s, ...dbCorr } = newCorr;
      this.supabase.from('attendance_corrections').insert([dbCorr]).then(({ error }) => {
        if (error) console.warn('Supabase correction insert error:', error.message || error);
      });
    }
  }

  resolveCorrection(id: string, status: CorrectionStatus, notes?: string): void {
    const current = [...this._corrections$.value];
    const idx = current.findIndex(c => c.id === id);
    if (idx === -1) return;

    current[idx] = {
      ...current[idx],
      status,
      admin_notes: notes,
      resolved_at: new Date().toISOString()
    };

    if (status === 'approved') {
      const recId = current[idx].attendance_record_id;
      const records = [...this._records$.value];
      const rIdx = records.findIndex(r => r.id === recId);
      if (rIdx !== -1) {
        records[rIdx].status = current[idx].requested_status;
        records[rIdx].updated_at = new Date().toISOString();
        this._records$.next(records);
      }
    }

    this._corrections$.next(current);

    if (this.supabase.isConfigured) {
      this.supabase.from('attendance_corrections').update({
        status,
        admin_notes: notes,
        resolved_at: current[idx].resolved_at
      }).eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase correction update error:', error.message || error);
      });

      if (status === 'approved') {
        const recId = current[idx].attendance_record_id;
        this.supabase.from('attendance').update({
          status: current[idx].requested_status,
          updated_at: new Date().toISOString()
        }).eq('id', recId).then(({ error }) => {
          if (error) console.warn('Supabase record status update error:', error.message || error);
        });
      }
    }
  }
}
