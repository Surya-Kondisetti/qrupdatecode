import { Component, OnInit } from '@angular/core';
import { QrService } from '../../core/services/qr.service';
import { StudentService } from '../../core/services/student.service';
import { ToastService } from '../../core/services/toast.service';
import { Student, Batch, QRDesignTemplate } from '../../models';

@Component({
  selector: 'app-qr-studio',
  templateUrl: './qr-studio.component.html',
  styleUrls: ['./qr-studio.component.scss']
})
export class QrStudioComponent implements OnInit {
  batches: Batch[] = [];
  selectedBatch: Batch | null = null;
  studentsInBatch: Student[] = [];
  sampleStudent: Student | null = null;

  template: QRDesignTemplate;
  previewDataUrl: string = '';
  isGeneratingZip = false;

  constructor(
    private qrService: QrService,
    private studentService: StudentService,
    private toastService: ToastService
  ) {
    this.template = this.qrService.getDefaultTemplate();
  }

  ngOnInit(): void {
    this.studentService.batches$.subscribe(b => {
      this.batches = b;
      if (b.length > 0) {
        this.selectBatch(b[0]);
      }
    });

    const students = this.studentService.getStudents();
    if (students.length > 0) {
      this.sampleStudent = students[0];
      this.updateLivePreview();
    }
  }

  selectBatch(batch: Batch): void {
    this.selectedBatch = batch;
    this.studentsInBatch = this.studentService.getStudents({ batch_id: batch.id });
    if (this.studentsInBatch.length > 0) {
      this.sampleStudent = this.studentsInBatch[0];
      this.updateLivePreview();
    }
  }

  async updateLivePreview(): Promise<void> {
    if (!this.sampleStudent) return;
    this.previewDataUrl = await this.qrService.renderStudentQRCard(this.sampleStudent, this.template);
  }

  onCustomFieldChange(): void {
    this.updateLivePreview();
  }

  onFieldToggle(): void {
    this.updateLivePreview();
  }

  onPositionChange(): void {
    this.updateLivePreview();
  }

  async downloadSingleSample(): Promise<void> {
    if (this.sampleStudent) {
      await this.qrService.downloadSingleStudentCard(this.sampleStudent, this.template);
      this.toastService.showSuccess(`Downloaded QR Card for ${this.sampleStudent.roll_number}`);
    }
  }

  async downloadBatchZIP(): Promise<void> {
    if (!this.selectedBatch || this.studentsInBatch.length === 0) {
      this.toastService.showWarning('No students available in selected batch');
      return;
    }

    this.isGeneratingZip = true;
    try {
      await this.qrService.downloadBatchQRZip(this.studentsInBatch, this.selectedBatch.name);
      this.toastService.showSuccess(`Downloaded TechWing_QR_Codes_${this.selectedBatch.name.replace(/\s+/g, '_')}.zip!`);
    } catch (err) {
      this.toastService.showError('ZIP generation failed');
    } finally {
      this.isGeneratingZip = false;
    }
  }
}
