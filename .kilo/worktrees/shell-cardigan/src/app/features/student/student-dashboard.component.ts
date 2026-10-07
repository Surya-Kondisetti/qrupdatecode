import { Component, OnInit } from '@angular/core';
import { StudentService } from '../../core/services/student.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { QrService } from '../../core/services/qr.service';
import { ArchiveService } from '../../core/services/archive.service';
import { ToastService } from '../../core/services/toast.service';
import { Student, AttendanceSummary, DailyAttendance, AttendanceArchive } from '../../models';

import { AuthService } from '../../core/auth/auth.service';

import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss']
})
export class StudentDashboardComponent implements OnInit {
  searchRollNumber: string = '';
  student: Student | null = null;
  summary: AttendanceSummary | null = null;
  dailyHistory: DailyAttendance[] = [];
  qrCardDataUrl: string = '';
  archives: AttendanceArchive[] = [];
  selectedMonthLabel: string = 'September 2026';
  allStudents: Student[] = [];
  activeSection: string = 'dashboard';

  constructor(
    private studentService: StudentService,
    private attendanceService: AttendanceService,
    private qrService: QrService,
    private archiveService: ArchiveService,
    private toastService: ToastService,
    public authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.refreshStudentDashboard();
    this.studentService.students$.subscribe(() => this.refreshStudentDashboard());
    this.attendanceService.records$.subscribe(() => this.refreshStudentDashboard());
    this.archives = this.archiveService.getArchives();

    this.route.url.subscribe(urlSegments => {
      const path = urlSegments[0]?.path || 'dashboard';
      this.activeSection = path;
      setTimeout(() => this.scrollToActiveSection(path), 150);
    });
  }

  scrollToActiveSection(path: string): void {
    let targetId = '';
    if (path === 'my-qr') targetId = 'my-qr-section';
    else if (path === 'calendar') targetId = 'calendar-section';
    else if (path === 'history') targetId = 'history-section';
    else targetId = 'dashboard-section';

    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private refreshStudentDashboard(): void {
    try {
      this.allStudents = this.studentService.getStudents() || [];
      const currentAuthUser = this.authService.currentUser;

      if (currentAuthUser && currentAuthUser.role === 'student') {
        const match = this.allStudents.find(s =>
          s.email.toLowerCase() === currentAuthUser.email.toLowerCase() ||
          s.id === currentAuthUser.id
        ) || this.allStudents[0];

        if (match) {
          this.loadStudentData(match);
          return;
        }
      }

      if (this.allStudents.length > 0 && !this.student) {
        this.loadStudentData(this.allStudents[0]);
      } else if (this.student) {
        this.loadStudentData(this.student);
      }
    } catch (e) {
      console.warn('Student dashboard refresh warning:', e);
    }
  }

  loadStudentData(stud: Student): void {
    this.student = stud;
    this.searchRollNumber = stud.roll_number;
    this.summary = this.attendanceService.getStudentSummary(stud.id);
    this.dailyHistory = this.attendanceService.getStudentDailyList(stud.id);
    this.loadQR();
  }

  lookupStudentByRoll(): void {
    if (!this.searchRollNumber) {
      this.toastService.showWarning('Please enter a Roll Number (e.g. 241UAI0070 or 23CS101)');
      return;
    }

    const found = this.studentService.getStudentByRollNumber(this.searchRollNumber.trim());
    if (found) {
      this.loadStudentData(found);
      this.toastService.showSuccess(`Loaded attendance record for ${found.full_name} (${found.roll_number})`);
    } else {
      this.toastService.showError(`No student found with Roll Number "${this.searchRollNumber}". Please check and try again.`);
    }
  }

  selectQuickRoll(roll: string): void {
    this.searchRollNumber = roll;
    this.lookupStudentByRoll();
  }

  async loadQR(): Promise<void> {
    if (this.student) {
      this.qrCardDataUrl = await this.qrService.renderStudentQRCard(this.student);
    }
  }

  async downloadMyPass(): Promise<void> {
    if (this.student) {
      await this.qrService.downloadSingleStudentCard(this.student);
      this.toastService.showSuccess(`Downloaded Skill Sync Attendance Pass for ${this.student.roll_number}`);
    }
  }

  get warningPrediction(): string | null {
    if (this.summary && this.summary.percentage < 75) {
      return 'Warning: Your current attendance is below the 75% requirement. Please attend upcoming sessions.';
    } else if (this.summary && this.summary.percentage < 80) {
      return 'Notice: At your current attendance trend, your attendance may fall near the 75% threshold.';
    }
    return null;
  }
}
