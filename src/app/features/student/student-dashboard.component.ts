import { Component, OnInit } from '@angular/core';
import { StudentService } from '../../core/services/student.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { QrService } from '../../core/services/qr.service';
import { ArchiveService } from '../../core/services/archive.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationService } from '../../core/services/notification.service';
import { EmailService } from '../../core/services/email.service';
import { Student, AttendanceSummary, DailyAttendance, AttendanceArchive, Notification } from '../../models';
import { AuthService } from '../../core/auth/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss']
})
export class StudentDashboardComponent implements OnInit {
  searchRollNumber: string = '';
  student: Student | null = null;
  overallSummary: AttendanceSummary | null = null;
  monthlySummary: AttendanceSummary | null = null;
  dailyHistory: DailyAttendance[] = [];
  filteredDailyHistory: DailyAttendance[] = [];
  qrCardDataUrl: string = '';
  archives: AttendanceArchive[] = [];
  selectedMonthLabel: string = 'September 2026';
  allStudents: Student[] = [];
  activeSection: string = 'dashboard';
  studentNotifications: Notification[] = [];
  sendingEmail: boolean = false;

  constructor(
    private studentService: StudentService,
    private attendanceService: AttendanceService,
    private qrService: QrService,
    private archiveService: ArchiveService,
    private toastService: ToastService,
    public notificationService: NotificationService,
    public emailService: EmailService,
    public authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.refreshStudentDashboard();
    this.studentService.students$.subscribe(() => this.refreshStudentDashboard());
    this.attendanceService.records$.subscribe(() => this.refreshStudentDashboard());
    this.notificationService.notifications$.subscribe(() => this.updateStudentNotifications());
    this.archives = this.archiveService.getArchives();

    this.route.url.subscribe(urlSegments => {
      const path = urlSegments[0]?.path || 'dashboard';
      this.activeSection = path;
    });
  }

  setSection(section: string): void {
    this.activeSection = section;
    this.router.navigate(['/student', section]);
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
    this.overallSummary = this.attendanceService.getStudentSummary(stud.id);
    this.dailyHistory = this.attendanceService.getStudentDailyList(stud.id);
    this.onMonthChange();
    this.updateStudentNotifications();
    this.loadQR();
  }

  onMonthChange(): void {
    if (!this.student) return;

    if (this.selectedMonthLabel === 'September 2026') {
      this.monthlySummary = this.attendanceService.getStudentSummary(this.student.id, 9, 2026);
      this.filteredDailyHistory = this.attendanceService.getStudentDailyList(this.student.id, 9, 2026);
    } else if (this.selectedMonthLabel === 'August 2026') {
      this.monthlySummary = this.attendanceService.getStudentSummary(this.student.id, 8, 2026);
      this.filteredDailyHistory = this.attendanceService.getStudentDailyList(this.student.id, 8, 2026);
    } else if (this.selectedMonthLabel === 'July 2026') {
      this.monthlySummary = this.attendanceService.getStudentSummary(this.student.id, 7, 2026);
      this.filteredDailyHistory = this.attendanceService.getStudentDailyList(this.student.id, 7, 2026);
    } else {
      // All time
      this.monthlySummary = this.overallSummary;
      this.filteredDailyHistory = [...this.dailyHistory];
    }
  }

  updateStudentNotifications(): void {
    if (!this.student) return;
    const all = this.notificationService.notifications;
    const studId = this.student.id;
    const userId = this.student.user_id;

    this.studentNotifications = all.filter(n =>
      n.user_id === 'all' || n.user_id === studId || n.user_id === userId
    );
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

  printQRPass(): void {
    window.print();
  }

  /**
   * Send test direct email absent notification to current student
   */
  async triggerDirectAbsentEmail(): Promise<void> {
    if (!this.student) return;
    this.sendingEmail = true;
    const today = new Date().toISOString().split('T')[0];

    const ok = await this.emailService.sendAbsentEmail(
      this.student.email,
      this.student.full_name,
      this.student.roll_number,
      'morning',
      today,
      this.monthlySummary ? this.monthlySummary.percentage : 75
    );

    this.sendingEmail = false;

    if (ok) {
      this.toastService.showSuccess(
        'Direct Email Sent!',
        `Absent notification email delivered to ${this.student.email}`
      );
    } else {
      this.toastService.showError('Email Delivery Error', 'Failed to send email to student address.');
    }
  }

  /**
   * Push an absent alert into student notification database
   */
  triggerDbAbsentNotification(): void {
    if (!this.student) return;
    const today = new Date().toISOString().split('T')[0];

    this.notificationService.addNotification(
      'absent_alert',
      '⚠️ Absent Alert Recorded in Database',
      `Official Notice: You were marked ABSENT for Morning session on ${today}. Total absent count updated to ${this.monthlySummary?.absent_days || 1} day(s).`,
      '/student/dashboard',
      this.student.id
    );

    this.updateStudentNotifications();
    this.toastService.showInfo('Database Updated', `Absent notification logged into database for ${this.student.full_name}`);
  }

  get warningPrediction(): string | null {
    if (this.monthlySummary && this.monthlySummary.percentage < 75) {
      return `Warning: Your attendance in ${this.selectedMonthLabel} is ${this.monthlySummary.percentage}%, below the 75% requirement. Attend upcoming sessions to avoid hall ticket issue.`;
    } else if (this.monthlySummary && this.monthlySummary.percentage < 80) {
      return `Notice: Your current attendance in ${this.selectedMonthLabel} is ${this.monthlySummary.percentage}%. Keep attending to remain safely above 75%.`;
    }
    return null;
  }
}
