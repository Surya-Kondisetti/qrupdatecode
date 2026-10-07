import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StudentService } from '../../core/services/student.service';
import { QrService } from '../../core/services/qr.service';
import { ToastService } from '../../core/services/toast.service';
import { Student, Branch, Batch, Mentor, HOD } from '../../models';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-student-management',
  templateUrl: './student-management.component.html',
  styleUrls: ['./student-management.component.scss']
})
export class StudentManagementComponent implements OnInit {
  activeTab: 'students' | 'mentors' | 'hods' = 'students';

  students: Student[] = [];
  branches: Branch[] = [];
  batches: Batch[] = [];
  mentors: Mentor[] = [];
  hods: HOD[] = [];

  // Filters & Search
  searchTerm: string = '';
  selectedBranchId: string = '';
  selectedBatchId: string = '';

  // Modals & Editing
  showAddModal = false;
  editingStudent: Student | null = null;

  showAddMentorModal = false;
  editingMentor: Mentor | null = null;

  showAddHODModal = false;
  editingHOD: HOD | null = null;

  showQRModal = false;
  selectedStudentForQR: Student | null = null;
  qrPreviewDataUrl: string = '';

  studentForm: FormGroup;
  mentorForm: FormGroup;
  hodForm: FormGroup;

  constructor(
    private studentService: StudentService,
    private qrService: QrService,
    private toastService: ToastService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.studentForm = this.fb.group({
      roll_number: ['', Validators.required],
      full_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['techwing@123', [Validators.required, Validators.minLength(6)]],
      phone: [''],
      gender: ['male'],
      branch_id: ['', Validators.required],
      batch_id: ['', Validators.required],
      combo_name: ['AWS + AGENTIC-AI'],
      year: [1, Validators.required],
      semester: [1, Validators.required]
    });

    this.mentorForm = this.fb.group({
      full_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['techwing@123', [Validators.required, Validators.minLength(6)]],
      employee_id: ['EMP-M101', Validators.required],
      branch_id: ['', Validators.required]
    });

    this.hodForm = this.fb.group({
      full_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['techwing@123', [Validators.required, Validators.minLength(6)]],
      employee_id: ['EMP-H101', Validators.required],
      branch_id: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.studentService.branches$.subscribe(b => this.branches = b);
    this.studentService.batches$.subscribe(bt => this.batches = bt);
    this.studentService.mentors$.subscribe(m => this.mentors = m);
    this.studentService.hods$.subscribe(h => this.hods = h);
    this.refreshStudents();
  }

  refreshStudents(): void {
    this.students = this.studentService.getStudents({
      search: this.searchTerm,
      branch_id: this.selectedBranchId,
      batch_id: this.selectedBatchId
    });
  }

  onSearchChange(): void {
    this.refreshStudents();
  }

  onFilterChange(): void {
    this.refreshStudents();
  }

  // Student Actions
  openAddModal(): void {
    this.editingStudent = null;
    this.studentForm.reset({
      gender: 'male',
      password: 'techwing@123',
      branch_id: this.branches[0]?.id || '',
      batch_id: this.batches[0]?.id || '',
      combo_name: 'AWS + AGENTIC-AI',
      year: 1,
      semester: 1
    });
    this.showAddModal = true;
  }

  openEditStudentModal(student: Student): void {
    this.editingStudent = student;
    const currentPass = this.authService.getUserPassword(student.email);
    this.studentForm.patchValue({
      roll_number: student.roll_number,
      full_name: student.full_name,
      email: student.email,
      password: currentPass,
      phone: student.phone || '',
      gender: student.gender || 'male',
      branch_id: student.branch_id,
      batch_id: student.batch_id,
      combo_name: student.combo_name || 'AWS + AGENTIC-AI',
      year: student.year || 1,
      semester: student.semester || 1
    });
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.editingStudent = null;
  }

  async saveStudent(): Promise<void> {
    if (this.studentForm.invalid) {
      this.toastService.showError('Please fill in all required student details');
      return;
    }

    const val = this.studentForm.value;

    if (this.editingStudent) {
      const res = await this.studentService.updateStudent(this.editingStudent.id, val);
      if (res.error) {
        this.toastService.showError(res.error);
      } else {
        await this.authService.updateUserProfileAndPassword(
          this.editingStudent.email,
          { full_name: val.full_name, email: val.email, phone: val.phone },
          val.password
        );
        this.toastService.showSuccess(`Student ${res.student?.full_name} updated successfully with new password!`);
        this.closeAddModal();
        this.refreshStudents();
      }
    } else {
      const res = await this.studentService.addStudent(val);
      if (res.error) {
        this.toastService.showError(res.error);
      } else {
        this.authService.registerUserAccount({
          email: val.email,
          pass: val.password || 'techwing@123',
          full_name: val.full_name,
          role: 'student'
        });
        this.toastService.showSuccess(`Student ${res.student?.full_name} added successfully! Credentials created.`);
        this.closeAddModal();
        this.refreshStudents();
      }
    }
  }

  async deleteStudent(student: Student): Promise<void> {
    if (confirm(`Are you sure you want to delete student ${student.full_name} (${student.roll_number})?`)) {
      await this.studentService.deleteStudent(student.id);
      this.toastService.showSuccess(`Deleted student ${student.full_name}`);
      this.refreshStudents();
    }
  }

  // Mentor Actions
  openAddMentorModal(): void {
    this.editingMentor = null;
    this.mentorForm.reset({
      password: 'techwing@123',
      employee_id: `EMP-M${Math.floor(100 + Math.random() * 900)}`,
      branch_id: this.branches[0]?.id || ''
    });
    this.showAddMentorModal = true;
  }

  openEditMentorModal(mentor: Mentor): void {
    this.editingMentor = mentor;
    const currentPass = this.authService.getUserPassword(mentor.email);
    this.mentorForm.patchValue({
      full_name: mentor.full_name,
      email: mentor.email,
      password: currentPass,
      employee_id: mentor.employee_id,
      branch_id: mentor.branch_id
    });
    this.showAddMentorModal = true;
  }

  closeAddMentorModal(): void {
    this.showAddMentorModal = false;
    this.editingMentor = null;
  }

  async saveMentor(): Promise<void> {
    if (this.mentorForm.invalid) {
      this.toastService.showError('Please fill in all required mentor fields');
      return;
    }
    const val = this.mentorForm.value;

    if (this.editingMentor) {
      const res = await this.studentService.updateMentor(this.editingMentor.id, val, val.password);
      if (res.error) {
        this.toastService.showError(res.error);
      } else {
        this.toastService.showSuccess(`Mentor ${res.mentor?.full_name} updated successfully!`);
        this.closeAddMentorModal();
      }
    } else {
      const res = this.studentService.addMentor(val, val.password);
      if (res.error) {
        this.toastService.showError(res.error);
      } else {
        this.toastService.showSuccess(`Mentor ${res.mentor?.full_name} created successfully! Username: ${val.email}`);
        this.closeAddMentorModal();
      }
    }
  }

  async deleteMentor(mentor: Mentor): Promise<void> {
    if (confirm(`Are you sure you want to delete mentor ${mentor.full_name} (${mentor.email})?`)) {
      await this.studentService.deleteMentor(mentor.id);
      this.toastService.showSuccess(`Deleted mentor ${mentor.full_name}`);
    }
  }

  // HOD Actions
  openAddHODModal(): void {
    this.editingHOD = null;
    this.hodForm.reset({
      password: 'techwing@123',
      employee_id: `EMP-H${Math.floor(100 + Math.random() * 900)}`,
      branch_id: this.branches[0]?.id || ''
    });
    this.showAddHODModal = true;
  }

  openEditHODModal(hod: HOD): void {
    this.editingHOD = hod;
    const currentPass = this.authService.getUserPassword(hod.email);
    this.hodForm.patchValue({
      full_name: hod.full_name,
      email: hod.email,
      password: currentPass,
      employee_id: hod.employee_id,
      branch_id: hod.branch_id
    });
    this.showAddHODModal = true;
  }

  closeAddHODModal(): void {
    this.showAddHODModal = false;
    this.editingHOD = null;
  }

  async saveHOD(): Promise<void> {
    if (this.hodForm.invalid) {
      this.toastService.showError('Please fill in all required HOD fields');
      return;
    }
    const val = this.hodForm.value;

    if (this.editingHOD) {
      const res = await this.studentService.updateHOD(this.editingHOD.id, val, val.password);
      if (res.error) {
        this.toastService.showError(res.error);
      } else {
        this.toastService.showSuccess(`HOD ${res.hod?.full_name} updated successfully!`);
        this.closeAddHODModal();
      }
    } else {
      const res = this.studentService.addHOD(val, val.password);
      if (res.error) {
        this.toastService.showError(res.error);
      } else {
        this.toastService.showSuccess(`HOD ${res.hod?.full_name} created successfully! Username: ${val.email}`);
        this.closeAddHODModal();
      }
    }
  }

  async deleteHOD(hod: HOD): Promise<void> {
    if (confirm(`Are you sure you want to delete HOD ${hod.full_name} (${hod.email})?`)) {
      await this.studentService.deleteHOD(hod.id);
      this.toastService.showSuccess(`Deleted HOD ${hod.full_name}`);
    }
  }

  // QR Modal
  async openQRModal(student: Student): Promise<void> {
    this.selectedStudentForQR = student;
    this.qrPreviewDataUrl = await this.qrService.renderStudentQRCard(student);
    this.showQRModal = true;
  }

  closeQRModal(): void {
    this.showQRModal = false;
    this.selectedStudentForQR = null;
  }

  async downloadSingleQR(): Promise<void> {
    if (this.selectedStudentForQR) {
      await this.qrService.downloadSingleStudentCard(this.selectedStudentForQR);
      this.toastService.showSuccess(`Downloaded QR Card for ${this.selectedStudentForQR.roll_number}`);
    }
  }

  async downloadBatchZIP(batch: Batch): Promise<void> {
    const batchStudents = this.students.filter(s => s.batch_id === batch.id);
    if (batchStudents.length === 0) {
      this.toastService.showWarning(`No students found in ${batch.name}`);
      return;
    }
    await this.qrService.downloadBatchQRZip(batchStudents, batch.name);
    this.toastService.showSuccess(`Generated and downloaded ZIP package for ${batch.name}`);
  }
}
