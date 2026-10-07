import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../core/services/attendance.service';
import { StudentService } from '../../core/services/student.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { AttendanceCorrection, Student } from '../../models';

@Component({
  selector: 'app-correction-requests',
  templateUrl: './correction-requests.component.html',
  styleUrls: ['./correction-requests.component.scss']
})
export class CorrectionRequestsComponent implements OnInit {
  corrections: AttendanceCorrection[] = [];
  students: Student[] = [];

  showRequestModal = false;
  selectedStudentId: string = '';
  reasonText: string = '';

  constructor(
    private attendanceService: AttendanceService,
    private studentService: StudentService,
    public authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.students = this.studentService.getStudents();
    this.attendanceService.corrections$.subscribe(c => this.corrections = c);
  }

  openRequestModal(): void {
    this.selectedStudentId = this.students[0]?.id || '';
    this.reasonText = '';
    this.showRequestModal = true;
  }

  closeModal(): void {
    this.showRequestModal = false;
  }

  submitRequest(): void {
    if (!this.reasonText) {
      this.toastService.showError('Please provide a reason for attendance correction');
      return;
    }

    const records = this.attendanceService.getRecords();
    const targetRec = records.find(r => r.student_id === this.selectedStudentId) || records[0];

    this.attendanceService.requestCorrection(targetRec.id, this.selectedStudentId, 'present', this.reasonText);
    this.toastService.showSuccess('Correction request submitted to Admin/HOD for approval');
    this.closeModal();
  }

  approveCorrection(id: string): void {
    this.attendanceService.resolveCorrection(id, 'approved', 'Approved by Admin');
    this.toastService.showSuccess('Attendance correction APPROVED! Student marked present.');
  }

  rejectCorrection(id: string): void {
    this.attendanceService.resolveCorrection(id, 'rejected', 'Rejected due to insufficient proof');
    this.toastService.showWarning('Attendance correction REJECTED.');
  }
}
