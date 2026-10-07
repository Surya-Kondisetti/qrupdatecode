import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../core/services/attendance.service';
import { StudentService } from '../../core/services/student.service';
import { ArchiveService } from '../../core/services/archive.service';
import { ExcelService } from '../../core/services/excel.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardStats, AttendanceRecord, Student } from '../../models';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  recentRecords: AttendanceRecord[] = [];
  todayStr: string = new Date().toISOString().split('T')[0];
  isArchiving = false;

  constructor(
    private attendanceService: AttendanceService,
    private studentService: StudentService,
    private archiveService: ArchiveService,
    private excelService: ExcelService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.refreshDashboardData();
    this.attendanceService.records$.subscribe(() => {
      this.refreshDashboardData();
    });
    this.studentService.students$.subscribe(() => {
      this.refreshDashboardData();
    });
  }

  private refreshDashboardData(): void {
    try {
      this.stats = this.attendanceService.getDashboardStats();
      this.recentRecords = (this.attendanceService.getRecords() || []).slice(0, 10);
    } catch (e) {
      console.warn('Dashboard data refresh error:', e);
    }
  }

  exportTodayReport(): void {
    const records = this.attendanceService.getRecords({ from_date: this.todayStr, to_date: this.todayStr });
    const data = records.map(r => ({
      'Roll Number': r.student?.roll_number,
      'Student Name': r.student?.full_name,
      'Branch': r.student?.branch?.code,
      'Batch': r.student?.batch?.name,
      'Session': r.session.toUpperCase(),
      'Status': r.status.toUpperCase(),
      'Scan Time': r.scan_time ? new Date(r.scan_time).toLocaleTimeString() : 'N/A'
    }));

    this.excelService.exportToExcel(data, `TechWing_Daily_Attendance_${this.todayStr}.xlsx`);
    this.toastService.showSuccess('Daily attendance exported to Excel');
  }

  async triggerMonthlyArchival(): Promise<void> {
    this.isArchiving = true;
    try {
      const monthLabel = 'September 2026';
      await this.archiveService.closeAndArchiveMonth(monthLabel, 9, 2026);
      this.toastService.showSuccess(`Monthly period archived! Downloaded ${monthLabel} ZIP archive to desktop.`);
    } catch (err) {
      this.toastService.showError('Archival failed');
    } finally {
      this.isArchiving = false;
    }
  }
}
