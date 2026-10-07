import { Component } from '@angular/core';
import { AttendanceService } from '../../core/services/attendance.service';
import { StudentService } from '../../core/services/student.service';
import { ToastService } from '../../core/services/toast.service';
import { Student, Session } from '../../models';

@Component({
  selector: 'app-qr-scanner',
  templateUrl: './qr-scanner.component.html',
  styleUrls: ['./qr-scanner.component.scss']
})
export class QrScannerComponent {
  selectedSession: Session = 'morning';
  manualTokenInput: string = '';

  lastScannedResult: {
    success: boolean;
    student?: Student;
    message: string;
    scanTime?: string;
  } | null = null;

  scannedHistory: { student: Student; time: string; session: string }[] = [];

  constructor(
    private attendanceService: AttendanceService,
    private studentService: StudentService,
    private toastService: ToastService
  ) {}

  onScanSuccess(qrResult: string): void {
    if (!qrResult) return;
    this.processQRToken(qrResult);
  }

  processQRToken(token: string): void {
    const res = this.attendanceService.markAttendanceByQR(token.trim(), this.selectedSession);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.lastScannedResult = {
      success: res.success,
      student: res.student,
      message: res.message,
      scanTime: nowTime
    };

    if (res.success && res.student) {
      this.toastService.showSuccess(res.message);
      this.scannedHistory.unshift({
        student: res.student,
        time: nowTime,
        session: this.selectedSession.toUpperCase()
      });
      this.playSuccessBeep();
    } else {
      this.toastService.showWarning(res.message);
    }
  }

  submitManualToken(): void {
    if (!this.manualTokenInput) return;
    this.processQRToken(this.manualTokenInput);
    this.manualTokenInput = '';
  }

  closeActiveSession(): void {
    if (confirm(`Are you sure you want to close the ${this.selectedSession.toUpperCase()} attendance session? All unscanned students will be automatically marked ABSENT.`)) {
      const res = this.attendanceService.closeSessionAndMarkAbsentees(this.selectedSession);
      this.toastService.showSuccess(`Closed ${this.selectedSession.toUpperCase()} session! Automatically marked ${res.absenteesMarked} unscanned students as ABSENT.`);
    }
  }

  private playSuccessBeep(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // ignore audio context restriction
    }
  }
}
