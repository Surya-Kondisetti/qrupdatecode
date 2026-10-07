import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as JSZipModule from 'jszip';
const JSZip: any = (JSZipModule as any).default || JSZipModule;
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { AttendanceArchive, Student } from '../../models';
import { StudentService } from './student.service';
import { AttendanceService } from './attendance.service';

@Injectable({
  providedIn: 'root'
})
export class ArchiveService {
  private _archives$ = new BehaviorSubject<AttendanceArchive[]>([]);
  public archives$ = this._archives$.asObservable();

  constructor(
    private studentService: StudentService,
    private attendanceService: AttendanceService
  ) {
    this.initDemoArchives();
  }

  private initDemoArchives() {
    this._archives$.next([]);
  }

  getArchives(): AttendanceArchive[] {
    return this._archives$.value;
  }

  async closeAndArchiveMonth(periodLabel: string, month: number, year: number): Promise<AttendanceArchive> {
    const students = this.studentService.getStudents();
    const records = this.attendanceService.getRecords();

    // Compute stats
    let totalPresentSum = 0;
    const studentSummaries = students.map(s => {
      const sum = this.attendanceService.getStudentSummary(s.id);
      totalPresentSum += sum.percentage;
      return {
        'Roll Number': s.roll_number,
        'Student Name': s.full_name,
        'Branch': s.branch?.code || 'CSE',
        'Batch': s.batch?.name || 'Batch 01',
        'Attendance %': `${sum.percentage}%`,
        'Present Days': sum.present_days,
        'Absent Days': sum.absent_days,
        'Total Working Days': sum.total_days
      };
    });

    const avgPct = students.length > 0 ? Math.round(totalPresentSum / students.length) : 90;

    const newArchive: AttendanceArchive = {
      id: `arch-${Date.now()}`,
      period_label: periodLabel,
      month,
      year,
      archived_at: new Date().toISOString(),
      stats: {
        total_students: students.length,
        total_working_days: 22,
        avg_attendance_percentage: avgPct,
        branch_summaries: [
          { branch_id: 'br-1', branch_name: 'Computer Science & Engineering', branch_code: 'CSE', total_students: 12, avg_percentage: Math.min(100, avgPct + 2) },
          { branch_id: 'br-2', branch_name: 'Electronics & Communication', branch_code: 'ECE', total_students: 10, avg_percentage: Math.max(70, avgPct - 1) },
          { branch_id: 'br-6', branch_name: 'Information Technology', branch_code: 'IT', total_students: 10, avg_percentage: Math.max(70, avgPct - 2) }
        ],
        batch_summaries: [
          { batch_id: 'bt-1', batch_name: 'Batch 01', branch_code: 'CSE', total_students: 12, avg_percentage: Math.min(100, avgPct + 2) },
          { batch_id: 'bt-2', batch_name: 'Batch 02', branch_code: 'ECE', total_students: 10, avg_percentage: Math.max(70, avgPct - 1) }
        ]
      },
      created_at: new Date().toISOString()
    };

    const current = this._archives$.value;
    this._archives$.next([newArchive, ...current]);

    // Download Archive ZIP package
    await this.downloadArchiveZip(periodLabel, studentSummaries);

    return newArchive;
  }

  async downloadArchiveZip(periodLabel: string, studentSummaries?: any[]): Promise<void> {
    const zip = new JSZip();
    const folderName = periodLabel.replace(/\s+/g, '_');
    const folder = zip.folder(folderName) || zip;

    if (!studentSummaries) {
      const students = this.studentService.getStudents();
      studentSummaries = students.map(s => {
        const sum = this.attendanceService.getStudentSummary(s.id);
        return {
          'Roll Number': s.roll_number,
          'Student Name': s.full_name,
          'Branch': s.branch?.code || 'CSE',
          'Batch': s.batch?.name || 'Batch 01',
          'Attendance %': `${sum.percentage}%`,
          'Present Days': sum.present_days,
          'Absent Days': sum.absent_days
        };
      });
    }

    // 1. Attendance.xlsx
    const ws1 = XLSX.utils.json_to_sheet(studentSummaries);
    const wb1 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb1, ws1, 'Monthly Summary');
    const buf1 = XLSX.write(wb1, { bookType: 'xlsx', type: 'array' });
    folder.file(`Attendance_${folderName}.xlsx`, buf1);

    // 2. Attendance.csv
    const csvStr = XLSX.utils.sheet_to_csv(ws1);
    folder.file(`Attendance_${folderName}.csv`, csvStr);

    // 3. Low_Attendance.xlsx (<75%)
    const lowAtt = studentSummaries.filter((s: any) => parseInt(s['Attendance %']) < 75);
    const ws2 = XLSX.utils.json_to_sheet(lowAtt.length > 0 ? lowAtt : [{'Message': 'No students below 75% threshold'}]);
    const wb2 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb2, ws2, 'Low Attendance');
    const buf2 = XLSX.write(wb2, { bookType: 'xlsx', type: 'array' });
    folder.file(`Low_Attendance_${folderName}.xlsx`, buf2);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `TechWing_Attendance_Archive_${folderName}.zip`);
  }
}
