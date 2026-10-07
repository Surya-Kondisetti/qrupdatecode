import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../core/services/attendance.service';
import { StudentService } from '../../core/services/student.service';
import { ExcelService } from '../../core/services/excel.service';
import { ToastService } from '../../core/services/toast.service';
import { Student, AttendanceRecord } from '../../models';

@Component({
  selector: 'app-today-attendance',
  templateUrl: './today-attendance.component.html',
  styleUrls: ['./today-attendance.component.scss']
})
export class TodayAttendanceComponent implements OnInit {
  todayStr = new Date().toISOString().split('T')[0];
  records: AttendanceRecord[] = [];
  students: Student[] = [];

  activeTab: 'all' | 'present' | 'absent' = 'all';

  constructor(
    private attendanceService: AttendanceService,
    private studentService: StudentService,
    private excelService: ExcelService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.records = this.attendanceService.getRecords({ from_date: this.todayStr, to_date: this.todayStr });
    this.students = this.studentService.getStudents();
  }

  get presentCount(): number {
    return this.records.filter(r => r.status === 'present').length;
  }

  get absentCount(): number {
    return Math.max(0, this.students.length - this.presentCount);
  }

  exportToday(): void {
    const data = this.students.map(s => {
      const rec = this.records.find(r => r.student_id === s.id);
      return {
        'Roll Number': s.roll_number,
        'Student Name': s.full_name,
        'Branch': s.branch?.code,
        'Batch': s.batch?.name,
        'Status': rec ? rec.status.toUpperCase() : 'ABSENT',
        'Scan Time': rec?.scan_time ? new Date(rec.scan_time).toLocaleTimeString() : 'N/A'
      };
    });

    this.excelService.exportToExcel(data, `Today_Attendance_${this.todayStr}.xlsx`);
    this.toastService.showSuccess('Exported today\'s attendance to Excel');
  }
}
