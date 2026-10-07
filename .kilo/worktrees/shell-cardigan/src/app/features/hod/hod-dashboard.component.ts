import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../core/services/attendance.service';
import { StudentService } from '../../core/services/student.service';
import { ExcelService } from '../../core/services/excel.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardStats, Student, AttendanceSummary, Batch, Branch } from '../../models';

@Component({
  selector: 'app-hod-dashboard',
  templateUrl: './hod-dashboard.component.html',
  styleUrls: ['./hod-dashboard.component.scss']
})
export class HodDashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  students: Student[] = [];
  filteredStudents: Student[] = [];
  branches: Branch[] = [];
  batches: Batch[] = [];

  searchQuery: string = '';
  selectedBranchId: string = '';
  selectedBatchId: string = '';

  lowAttendanceStudents: { student: Student; summary: AttendanceSummary }[] = [];

  constructor(
    private attendanceService: AttendanceService,
    private studentService: StudentService,
    private excelService: ExcelService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.studentService.branches$.subscribe(b => this.branches = b);
    this.studentService.batches$.subscribe(b => this.batches = b);

    this.refreshHodData();
    this.studentService.students$.subscribe(() => this.refreshHodData());
    this.attendanceService.records$.subscribe(() => this.refreshHodData());
  }

  private refreshHodData(): void {
    try {
      this.stats = this.attendanceService.getDashboardStats();
      this.students = this.studentService.getStudents() || [];
      this.onSearchOrFilterChange();

      this.lowAttendanceStudents = [];
      this.students.forEach(s => {
        if (s && s.id) {
          const sum = this.attendanceService.getStudentSummary(s.id);
          if (sum.percentage < 75) {
            this.lowAttendanceStudents.push({ student: s, summary: sum });
          }
        }
      });
    } catch (e) {
      console.warn('HOD dashboard refresh warning:', e);
    }
  }

  onSearchOrFilterChange(): void {
    let list = [...this.students];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(s =>
        s.full_name.toLowerCase().includes(q) ||
        s.roll_number.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    }

    if (this.selectedBranchId) {
      list = list.filter(s => s.branch_id === this.selectedBranchId);
    }

    if (this.selectedBatchId) {
      list = list.filter(s => s.batch_id === this.selectedBatchId);
    }

    this.filteredStudents = list;
  }

  getStudentSummary(studentId: string): AttendanceSummary {
    return this.attendanceService.getStudentSummary(studentId);
  }

  sendEmailToHOD(): void {
    this.toastService.showSuccess('Daily Attendance Report & Absentee list sent directly to HOD email!');
  }

  downloadBatchAttendanceReport(): void {
    const data = this.filteredStudents.map(s => {
      const sum = this.getStudentSummary(s.id);
      return {
        'Roll Number': s.roll_number,
        'Student Name': s.full_name,
        'Branch': s.branch?.code,
        'Batch': s.batch?.name,
        'Combo Course': s.combo_name || 'AWS + AGENTIC-AI',
        'Attendance %': `${sum.percentage}%`,
        'Present Days': sum.present_days,
        'Absent Days': sum.absent_days,
        'Total Working Days': sum.total_days
      };
    });

    const batchName = this.batches.find(b => b.id === this.selectedBatchId)?.name || 'All_Batches';
    this.excelService.exportToExcel(data, `HOD_Attendance_Report_${batchName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.toastService.showSuccess(`Downloaded attendance report for ${batchName} to desktop!`);
  }
}
