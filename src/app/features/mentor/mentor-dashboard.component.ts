import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../core/services/attendance.service';
import { StudentService } from '../../core/services/student.service';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardStats, AttendanceRecord, Student } from '../../models';

@Component({
  selector: 'app-mentor-dashboard',
  templateUrl: './mentor-dashboard.component.html',
  styleUrls: ['./mentor-dashboard.component.scss']
})
export class MentorDashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  assignedStudents: Student[] = [];
  todayRecords: AttendanceRecord[] = [];
  todayStr: string = new Date().toISOString().split('T')[0];

  constructor(
    private attendanceService: AttendanceService,
    private studentService: StudentService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.refreshMentorData();
    this.studentService.students$.subscribe(() => this.refreshMentorData());
    this.attendanceService.records$.subscribe(() => this.refreshMentorData());
  }

  private refreshMentorData(): void {
    try {
      this.stats = this.attendanceService.getDashboardStats();
      this.assignedStudents = this.studentService.getStudents() || [];
      this.todayRecords = (this.attendanceService.getRecords({ from_date: this.todayStr, to_date: this.todayStr }) || []);
    } catch (e) {
      console.warn('Mentor dashboard refresh warning:', e);
    }
  }
}
