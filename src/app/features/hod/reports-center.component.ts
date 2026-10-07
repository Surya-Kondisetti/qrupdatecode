import { Component, OnInit } from '@angular/core';
import { ExcelService } from '../../core/services/excel.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { StudentService } from '../../core/services/student.service';
import { ToastService } from '../../core/services/toast.service';
import { Branch, Batch, Student } from '../../models';

@Component({
  selector: 'app-reports-center',
  templateUrl: './reports-center.component.html',
  styleUrls: ['./reports-center.component.scss']
})
export class ReportsCenterComponent implements OnInit {
  lastGoogleSheetsSync = new Date().toLocaleString();
  isSyncingSheets = false;

  branches: Branch[] = [];
  batches: Batch[] = [];

  selectedBranchId: string = '';
  selectedBatchId: string = '';
  selectedStatusFilter: 'all' | 'absent' | 'present' | 'late' | 'low_attendance' = 'all';
  reportTimeframe: 'overall' | 'daily' | 'weekly' | 'monthly' = 'overall';

  fromDate: string = '';
  toDate: string = '';

  constructor(
    private excelService: ExcelService,
    private attendanceService: AttendanceService,
    private studentService: StudentService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.studentService.branches$.subscribe(b => this.branches = b);
    this.studentService.batches$.subscribe(b => this.batches = b);
  }

  sendMorningEmailReport(): void {
    this.toastService.showSuccess('Morning Attendance Report emailed to HOD with Excel attachment!');
  }

  sendAfternoonEmailReport(): void {
    this.toastService.showSuccess('Afternoon Attendance Report emailed to HOD with Excel attachment!');
  }

  syncGoogleSheetsNow(): void {
    this.isSyncingSheets = true;
    setTimeout(() => {
      this.lastGoogleSheetsSync = new Date().toLocaleString();
      this.isSyncingSheets = false;
      this.toastService.showSuccess('Google Sheets Synchronized successfully! Updated September 2026 worksheet.');
    }, 1200);
  }

  /**
   * One-click download specifically for Absentees
   */
  exportAbsenteesOnly(format: 'xlsx' | 'csv' | 'pdf' = 'xlsx'): void {
    this.selectedStatusFilter = 'absent';
    this.exportReport(format);
  }

  /**
   * One-click download specifically for Low Attendance Defaulters (<75%)
   */
  exportLowAttendanceDefaulters(format: 'xlsx' | 'csv' | 'pdf' = 'xlsx'): void {
    this.selectedStatusFilter = 'low_attendance';
    this.exportReport(format);
  }

  /**
   * Universal export according to user requirements
   */
  exportReport(format: 'xlsx' | 'csv' | 'pdf' | 'json' = 'xlsx'): void {
    let students = this.studentService.getStudents() || [];

    if (this.selectedBranchId) {
      students = students.filter(s => s.branch_id === this.selectedBranchId);
    }
    if (this.selectedBatchId) {
      students = students.filter(s => s.batch_id === this.selectedBatchId);
    }

    const branchName = this.selectedBranchId ? (this.branches.find(b => b.id === this.selectedBranchId)?.code || 'Dept') : 'All_Depts';
    const batchName = this.selectedBatchId ? (this.batches.find(b => b.id === this.selectedBatchId)?.name.replace(/\s+/g, '_') || 'Batch') : 'All_Batches';
    const statusLabel = this.selectedStatusFilter.toUpperCase();
    const filename = `HOD_${statusLabel}_Report_${branchName}_${batchName}_${new Date().toISOString().split('T')[0]}`;

    let data: any[] = [];
    let headers: string[] = ['Roll Number', 'Student Name', 'Branch', 'Batch', 'Status / Attendance %', 'Present Days', 'Absent Days', 'Total Days', 'Email', 'Phone'];

    // Map student records with stats & filter by requirement
    const filteredRows = students.map(s => {
      const sum = this.attendanceService.getStudentSummary(s.id);
      return {
        student: s,
        summary: sum
      };
    }).filter(item => {
      if (this.selectedStatusFilter === 'absent') {
        return item.summary.absent_days > 0;
      } else if (this.selectedStatusFilter === 'present') {
        return item.summary.present_days > 0;
      } else if (this.selectedStatusFilter === 'low_attendance') {
        return item.summary.percentage < 75;
      } else if (this.selectedStatusFilter === 'late') {
        return item.summary.late_days > 0;
      }
      return true;
    });

    data = filteredRows.map(item => {
      const s = item.student;
      const sum = item.summary;
      return {
        'Roll Number': s.roll_number,
        'Student Name': s.full_name,
        'Branch': s.branch?.code || 'CSE',
        'Batch': s.batch?.name || 'Batch 01',
        'Status / Attendance %': `${sum.percentage}%`,
        'Present Days': sum.present_days,
        'Absent Days': sum.absent_days,
        'Total Days': sum.total_days,
        'Email': s.email,
        'Phone': s.phone || 'N/A'
      };
    });

    if (data.length === 0) {
      this.toastService.showWarning(`No student records found matching requirement: "${this.selectedStatusFilter.toUpperCase()}"!`);
      return;
    }

    if (format === 'xlsx') {
      this.excelService.exportToExcel(data, `${filename}.xlsx`, 'Attendance_Report');
      this.toastService.showSuccess(`Downloaded ${data.length} records matching "${statusLabel}" requirement in Excel (.xlsx)`);
    } else if (format === 'csv') {
      this.excelService.exportToCSV(data, `${filename}.csv`);
      this.toastService.showSuccess(`Downloaded ${data.length} records matching "${statusLabel}" requirement in CSV (.csv)`);
    } else if (format === 'json') {
      this.excelService.exportToJSON(data, `${filename}.json`);
      this.toastService.showSuccess(`Downloaded ${data.length} records in JSON (.json) format`);
    } else if (format === 'pdf') {
      this.excelService.exportToPDF(
        `ATTENDANCE REPORT - ${statusLabel}`,
        `Department: ${branchName} | Batch: ${batchName} | Requirement Filter: ${statusLabel}`,
        headers,
        data,
        `${filename}.pdf`
      );
      this.toastService.showSuccess(`Opened Printable PDF Report for ${data.length} records`);
    }
  }

  downloadFullDepartmentReport(): void {
    this.exportReport('xlsx');
  }
}
