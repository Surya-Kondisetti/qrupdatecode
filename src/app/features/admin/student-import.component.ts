import { Component } from '@angular/core';
import { ExcelService } from '../../core/services/excel.service';
import { StudentService } from '../../core/services/student.service';
import { QrService } from '../../core/services/qr.service';
import { ToastService } from '../../core/services/toast.service';
import { StudentImportRow, ImportResult, Student } from '../../models';

@Component({
  selector: 'app-student-import',
  templateUrl: './student-import.component.html',
  styleUrls: ['./student-import.component.scss']
})
export class StudentImportComponent {
  currentStep: number = 1;
  selectedFile: File | null = null;
  parsedRows: StudentImportRow[] = [];
  importResult: ImportResult | null = null;
  importedStudentsList: Student[] = [];
  isProcessing = false;
  isDownloadingZip = false;

  constructor(
    private excelService: ExcelService,
    private studentService: StudentService,
    private qrService: QrService,
    private toastService: ToastService
  ) {}

  downloadTemplate(): void {
    this.excelService.downloadImportTemplate();
    this.toastService.showSuccess('Downloaded student_import_template.xlsx');
  }

  async onFileSelected(event: any): Promise<void> {
    const file: File = event.target.files[0];
    if (!file) return;

    this.selectedFile = file;
    this.isProcessing = true;
    try {
      this.currentStep = 2;
      this.parsedRows = await this.excelService.parseExcelOrCSV(file);
      this.validateParsedRows();
      this.currentStep = 3;
      this.toastService.showInfo(`Loaded ${this.parsedRows.length} student records from ${file.name}`);
    } catch (err) {
      this.toastService.showError('Could not parse file. Ensure it is a valid Excel or CSV spreadsheet.');
      this.currentStep = 1;
    } finally {
      this.isProcessing = false;
    }
  }

  validateParsedRows(): void {
    const currentStudents = this.studentService.getStudents();
    const existingRolls = new Set(currentStudents.map(s => s.roll_number.toLowerCase()));
    const existingEmails = new Set(currentStudents.map(s => s.email.toLowerCase()));
    const seenRolls = new Set<string>();

    this.parsedRows.forEach((row, i) => {
      row._row = i + 1;
      row._errors = [];
      row._valid = true;

      if (!row.roll_number) row._errors.push('Missing Roll Number');
      if (!row.full_name) row._errors.push('Missing Student Name');
      if (!row.email) row._errors.push('Missing Email Address');

      const rollLower = row.roll_number?.toLowerCase();
      if (rollLower && existingRolls.has(rollLower)) {
        row._errors.push(`Duplicate Roll Number (already in database): ${row.roll_number}`);
      } else if (rollLower && seenRolls.has(rollLower)) {
        row._errors.push(`Duplicate Roll Number within spreadsheet: ${row.roll_number}`);
      } else if (rollLower) {
        seenRolls.add(rollLower);
      }

      if (row._errors.length > 0) {
        row._valid = false;
      }
    });
  }

  removeRow(index: number): void {
    this.parsedRows.splice(index, 1);
    this.validateParsedRows();
    this.toastService.showInfo('Removed row from preview table');
  }

  async processImport(): Promise<void> {
    const validRows = this.parsedRows.filter(r => r._valid);
    if (validRows.length === 0) {
      this.toastService.showError('No valid records found to import. Please fix errors first.');
      return;
    }

    this.isProcessing = true;
    this.currentStep = 5;

    try {
      this.importResult = await this.studentService.bulkImport(validRows);
      this.importedStudentsList = this.studentService.getStudents().slice(0, this.importResult.imported);
      this.currentStep = 6;
      this.toastService.showSuccess(`Imported ${this.importResult.imported} trainees & generated unique Skill Sync QR passes at once!`);

      // Trigger automatic ZIP download for imported batch
      this.downloadImportedQRZip();
    } catch (err) {
      this.toastService.showError('Import processing failed');
    } finally {
      this.isProcessing = false;
    }
  }

  async downloadImportedQRZip(): Promise<void> {
    if (this.importedStudentsList.length === 0) {
      this.importedStudentsList = this.studentService.getStudents().slice(0, 10);
    }
    this.isDownloadingZip = true;
    try {
      await this.qrService.downloadBatchQRZip(this.importedStudentsList, 'Imported_Trainees');
      this.toastService.showSuccess('Downloaded TechWing_SkillSync_QR_Codes_Imported_Trainees.zip to your downloads folder!');
    } catch (e) {
      this.toastService.showError('ZIP download failed');
    } finally {
      this.isDownloadingZip = false;
    }
  }

  resetImport(): void {
    this.currentStep = 1;
    this.selectedFile = null;
    this.parsedRows = [];
    this.importResult = null;
    this.importedStudentsList = [];
  }
}
