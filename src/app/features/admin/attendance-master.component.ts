import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../core/services/attendance.service';
import { StudentService } from '../../core/services/student.service';
import { ExcelService } from '../../core/services/excel.service';
import { ToastService } from '../../core/services/toast.service';
import { AttendanceRecord, Branch, Batch } from '../../models';

@Component({
  selector: 'app-attendance-master',
  templateUrl: './attendance-master.component.html',
  styleUrls: ['./attendance-master.component.scss']
})
export class AttendanceMasterComponent implements OnInit {
  records: AttendanceRecord[] = [];
  branches: Branch[] = [];
  batches: Batch[] = [];

  filterSearch: string = '';
  filterBranchId: string = '';
  filterBatchId: string = '';
  filterStatus: string = '';

  constructor(
    private attendanceService: AttendanceService,
    private studentService: StudentService,
    private excelService: ExcelService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.studentService.branches$.subscribe(b => this.branches = b);
    this.studentService.batches$.subscribe(bt => this.batches = bt);
    this.refreshRecords();
  }

  refreshRecords(): void {
    this.records = this.attendanceService.getRecords({
      search: this.filterSearch,
      branch_id: this.filterBranchId,
      batch_id: this.filterBatchId,
      status: this.filterStatus
    });
  }

  exportExcel(): void {
    const data = this.records.map(r => ({
      'Date': r.attendance_date,
      'Roll Number': r.student?.roll_number,
      'Student Name': r.student?.full_name,
      'Branch': r.student?.branch?.code,
      'Batch': r.student?.batch?.name,
      'Session': r.session.toUpperCase(),
      'Status': r.status.toUpperCase(),
      'Scan Time': r.scan_time ? new Date(r.scan_time).toLocaleTimeString() : 'N/A'
    }));

    this.excelService.exportToExcel(data, `TechWing_Attendance_Master_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.toastService.showSuccess('Exported attendance master data to Excel');
  }

  exportCSV(): void {
    const data = this.records.map(r => ({
      'Date': r.attendance_date,
      'Roll Number': r.student?.roll_number,
      'Student Name': r.student?.full_name,
      'Branch': r.student?.branch?.code,
      'Batch': r.student?.batch?.name,
      'Session': r.session.toUpperCase(),
      'Status': r.status.toUpperCase()
    }));

    this.excelService.exportToCSV(data, `TechWing_Attendance_${new Date().toISOString().split('T')[0]}.csv`);
    this.toastService.showSuccess('Exported attendance data to CSV');
  }
}
