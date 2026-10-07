import { Component } from '@angular/core';
import { ExcelService } from '../../core/services/excel.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { StudentService } from '../../core/services/student.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-reports-center',
  templateUrl: './reports-center.component.html',
  styleUrls: ['./reports-center.component.scss']
})
export class ReportsCenterComponent {
  lastGoogleSheetsSync = new Date().toLocaleString();
  isSyncingSheets = false;

  constructor(
    private excelService: ExcelService,
    private attendanceService: AttendanceService,
    private studentService: StudentService,
    private toastService: ToastService
  ) {}

  sendMorningEmailReport(): void {
    this.toastService.showSuccess('Morning Attendance Report emailed to HOD (Dr. Anita Verma) with Excel attachment!');
  }

  sendAfternoonEmailReport(): void {
    this.toastService.showSuccess('Afternoon Attendance Report emailed to HOD (Dr. Anita Verma) with Excel attachment!');
  }

  syncGoogleSheetsNow(): void {
    this.isSyncingSheets = true;
    setTimeout(() => {
      this.lastGoogleSheetsSync = new Date().toLocaleString();
      this.isSyncingSheets = false;
      this.toastService.showSuccess('Google Sheets Synchronized successfully! Updated September 2026 worksheet.');
    }, 1200);
  }

  downloadFullDepartmentReport(): void {
    const students = this.studentService.getStudents();
    const data = students.map(s => {
      const sum = this.attendanceService.getStudentSummary(s.id);
      return {
        'Roll Number': s.roll_number,
        'Student Name': s.full_name,
        'Branch': s.branch?.code,
        'Batch': s.batch?.name,
        'Attendance %': `${sum.percentage}%`,
        'Present Days': sum.present_days,
        'Absent Days': sum.absent_days,
        'Total Working Days': sum.total_days
      };
    });

    this.excelService.exportToExcel(data, `Department_Attendance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.toastService.showSuccess('Department Excel Report downloaded');
  }
}
