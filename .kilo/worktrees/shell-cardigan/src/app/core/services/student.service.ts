import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
import { Student, Branch, Batch, Mentor, HOD, QueryOptions, StudentImportRow, ImportResult } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private _students$ = new BehaviorSubject<Student[]>([]);
  public students$ = this._students$.asObservable();

  private _branches$ = new BehaviorSubject<Branch[]>([]);
  public branches$ = this._branches$.asObservable();

  private _batches$ = new BehaviorSubject<Batch[]>([]);
  public batches$ = this._batches$.asObservable();

  private _mentors$ = new BehaviorSubject<Mentor[]>([]);
  public mentors$ = this._mentors$.asObservable();

  private _hods$ = new BehaviorSubject<HOD[]>([]);
  public hods$ = this._hods$.asObservable();

  constructor(
    private supabase: SupabaseService,
    private authService: AuthService
  ) {
    this.initInitialData();
  }

  private async initInitialData() {
    this.initBranchesAndBatches();
    if (this.supabase.isConfigured) {
      await this.loadAllFromSupabase();
    }
  }

  public async loadAllFromSupabase(): Promise<void> {
    try {
      const [bRes, btRes, mRes, hRes, sRes, qRes] = await Promise.all([
        this.supabase.from('branches').select('*'),
        this.supabase.from('batches').select('*'),
        this.supabase.from('mentors').select('*'),
        this.supabase.from('hods').select('*'),
        this.supabase.from('students').select('*'),
        this.supabase.from('qr_codes').select('*')
      ]);

      const branches: Branch[] = (bRes.data && bRes.data.length > 0) ? (bRes.data as Branch[]) : this._branches$.value;
      this._branches$.next(branches);

      const branchMap = new Map<string, Branch>();
      branches.forEach(b => branchMap.set(b.id, b));

      const batches: Batch[] = (btRes.data && btRes.data.length > 0) ? (btRes.data as any[]).map(bt => ({
        ...bt,
        branch: branchMap.get(bt.branch_id) || branches[0]
      })) : this._batches$.value;
      this._batches$.next(batches);

      const batchMap = new Map<string, Batch>();
      batches.forEach(bt => batchMap.set(bt.id, bt));

      const mentors: Mentor[] = (mRes.data && mRes.data.length > 0) ? (mRes.data as any[]).map(m => ({
        ...m,
        branch: branchMap.get(m.branch_id) || branches[0]
      })) : [];
      this._mentors$.next(mentors);

      const mentorMap = new Map<string, Mentor>();
      mentors.forEach(m => mentorMap.set(m.id, m));

      const hods: HOD[] = (hRes.data && hRes.data.length > 0) ? (hRes.data as any[]).map(h => ({
        ...h,
        branch: branchMap.get(h.branch_id) || branches[0]
      })) : [];
      this._hods$.next(hods);

      const hodMap = new Map<string, HOD>();
      hods.forEach(h => hodMap.set(h.id, h));

      const qrMap = new Map<string, any>();
      if (qRes.data) {
        qRes.data.forEach((q: any) => qrMap.set(q.student_id, q));
      }

      if (sRes.data && sRes.data.length > 0) {
        const students: Student[] = (sRes.data as any[]).map(s => {
          const qr = qrMap.get(s.id) || {
            id: `qr-${s.id}`,
            student_id: s.id,
            token: `token-uuid-${s.roll_number || s.id}`,
            is_active: true,
            generated_at: s.created_at || new Date().toISOString(),
            created_at: s.created_at || new Date().toISOString()
          };
          return {
            ...s,
            branch: branchMap.get(s.branch_id) || branches[0],
            batch: batchMap.get(s.batch_id) || batches[0],
            mentor: s.mentor_id ? mentorMap.get(s.mentor_id) : undefined,
            hod: s.hod_id ? hodMap.get(s.hod_id) : undefined,
            qr_code: qr
          } as Student;
        });

        this._students$.next(students);
      }
    } catch (e) {
      console.warn('Supabase fetch error:', e);
    }
  }

  private initBranchesAndBatches() {
    const branches: Branch[] = [
      { id: 'br-1', name: 'Computer Science & Engineering', code: 'CSE', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'br-2', name: 'Electronics & Communication Eng.', code: 'ECE', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'br-3', name: 'Electrical & Electronics Eng.', code: 'EEE', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'br-4', name: 'Mechanical Engineering', code: 'MECH', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'br-5', name: 'Civil Engineering', code: 'CIVIL', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'br-6', name: 'Information Technology', code: 'IT', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ];

    const defaultBatches: Batch[] = [
      { id: 'bt-1', name: 'Batch 01', branch_id: 'br-1', academic_year: '2026-27', semester: 1, year: 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), branch: branches[0] },
      { id: 'bt-2', name: 'Batch 02', branch_id: 'br-1', academic_year: '2026-27', semester: 3, year: 2, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), branch: branches[0] },
      { id: 'bt-3', name: 'Batch 03', branch_id: 'br-2', academic_year: '2026-27', semester: 5, year: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), branch: branches[1] }
    ];

    this._branches$.next(branches);
    this._batches$.next(defaultBatches);
    this._mentors$.next([]);
    this._hods$.next([]);
    this._students$.next([]);
  }

  getStudents(options?: QueryOptions): Student[] {
    let list = [...this._students$.value];

    if (!options) return list;

    if (options.search) {
      const q = options.search.toLowerCase();
      list = list.filter(s =>
        s.full_name.toLowerCase().includes(q) ||
        s.roll_number.toLowerCase().includes(q) ||
        s.student_id.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    }

    if (options.branch_id) {
      list = list.filter(s => s.branch_id === options.branch_id);
    }
    if (options.batch_id) {
      list = list.filter(s => s.batch_id === options.batch_id);
    }
    if (options.mentor_id) {
      list = list.filter(s => s.mentor_id === options.mentor_id);
    }

    return list;
  }

  getStudentById(id: string): Student | undefined {
    return this._students$.value.find(s => s.id === id || s.student_id === id);
  }

  getStudentByRollNumber(rollNumber: string): Student | undefined {
    return this._students$.value.find(s => s.roll_number.toLowerCase() === rollNumber.toLowerCase());
  }

  getStudentByQRToken(rawInput: string): Student | undefined {
    if (!rawInput) return undefined;
    const cleanInput = rawInput.trim();

    if (cleanInput.includes('TWSEC-OFFICIAL-2026::')) {
      const parts = cleanInput.split('::');
      const token = parts[1];
      const roll = parts[2];
      return this._students$.value.find(s =>
        s.qr_code?.token === token ||
        (roll && s.roll_number.toLowerCase() === roll.toLowerCase()) ||
        s.student_id === token ||
        s.id === token
      );
    }

    return this._students$.value.find(s => s.qr_code?.token === cleanInput);
  }

  async addStudent(studentData: Partial<Student>): Promise<{ student?: Student; error?: string }> {
    const existing = this._students$.value.find(s =>
      s.roll_number.toLowerCase() === studentData.roll_number?.toLowerCase() ||
      s.email.toLowerCase() === studentData.email?.toLowerCase()
    );

    if (existing) {
      return { error: `Student with roll number ${studentData.roll_number} or email ${studentData.email} already exists.` };
    }

    const newId = `stu-${Date.now()}`;
    const autoStudId = `STU-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const branch = this._branches$.value.find(b => b.id === studentData.branch_id);
    const batch = this._batches$.value.find(b => b.id === studentData.batch_id);
    const mentor = this._mentors$.value.find(m => m.id === studentData.mentor_id);
    const hod = this._hods$.value.find(h => h.id === studentData.hod_id);

    const newStudent: Student = {
      id: newId,
      student_id: studentData.student_id || autoStudId,
      roll_number: studentData.roll_number!,
      full_name: studentData.full_name!,
      email: studentData.email!,
      phone: studentData.phone,
      gender: studentData.gender || 'male',
      branch_id: studentData.branch_id!,
      batch_id: studentData.batch_id!,
      combo_name: studentData.combo_name || 'AWS + AGENTIC-AI',
      year: studentData.year || 1,
      semester: studentData.semester || 1,
      mentor_id: studentData.mentor_id,
      hod_id: studentData.hod_id,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      branch,
      batch,
      mentor,
      hod,
      qr_code: {
        id: `qr-${Date.now()}`,
        student_id: newId,
        token: `token-uuid-${Math.floor(100000 + Math.random() * 900000)}`,
        is_active: true,
        generated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
    };

    if (this.supabase.isConfigured) {
      try {
        const { branch: _b, batch: _bt, mentor: _m, hod: _h, qr_code: _qr, ...dbStudent } = newStudent;
        await this.supabase.from('students').insert([dbStudent]);
        if (newStudent.qr_code) {
          await this.supabase.from('qr_codes').upsert({
            id: newStudent.qr_code.id,
            student_id: newStudent.id,
            token: newStudent.qr_code.token,
            is_active: true,
            generated_at: newStudent.qr_code.generated_at,
            created_at: newStudent.qr_code.created_at
          });
        }
      } catch (e) {
        console.warn('Supabase insert warning:', e);
      }
    }

    const current = this._students$.value;
    this._students$.next([newStudent, ...current]);

    // Register user account in AuthService for student login
    const initialPass = studentData.phone || 'techwing@123';
    this.authService.registerUserAccount({
      email: studentData.email!,
      pass: initialPass,
      full_name: studentData.full_name!,
      role: 'student'
    });

    return { student: newStudent };
  }

  addMentor(mentorData: Partial<Mentor>, password?: string): { mentor?: Mentor; error?: string } {
    const existing = this._mentors$.value.find(m => m.email.toLowerCase() === mentorData.email?.toLowerCase());
    if (existing) {
      return { error: `Mentor with email ${mentorData.email} already exists.` };
    }

    const newId = `m-${Date.now()}`;
    const branch = this._branches$.value.find(b => b.id === mentorData.branch_id);
    const newMentor: Mentor = {
      id: newId,
      user_id: `u-m-${Date.now()}`,
      employee_id: mentorData.employee_id || `EMP-M${Math.floor(100 + Math.random() * 900)}`,
      full_name: mentorData.full_name!,
      email: mentorData.email!,
      branch_id: mentorData.branch_id!,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      branch
    };

    const current = this._mentors$.value;
    this._mentors$.next([newMentor, ...current]);

    const initialPass = password || 'techwing@123';
    this.authService.registerUserAccount({
      email: mentorData.email!,
      pass: initialPass,
      full_name: mentorData.full_name!,
      role: 'mentor'
    });

    if (this.supabase.isConfigured) {
      const { branch: _b, ...dbMentor } = newMentor;
      this.supabase.from('mentors').insert([dbMentor]).then(({ error }) => {
        if (error) console.warn('Supabase mentor insert error:', error);
      });
    }

    return { mentor: newMentor };
  }

  async updateMentor(id: string, updates: Partial<Mentor>, password?: string): Promise<{ mentor?: Mentor; error?: string }> {
    const list = [...this._mentors$.value];
    const index = list.findIndex(m => m.id === id);
    if (index === -1) return { error: 'Mentor not found' };

    const updated: Mentor = {
      ...list[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (updates.branch_id) updated.branch = this._branches$.value.find(b => b.id === updates.branch_id);

    list[index] = updated;
    this._mentors$.next(list);

    if (password && updated.email) {
      this.authService.registerUserAccount({
        email: updated.email,
        pass: password,
        full_name: updated.full_name,
        role: 'mentor'
      });
    }

    if (this.supabase.isConfigured) {
      try {
        const { branch: _b, ...cleanUpdates } = updates;
        if (Object.keys(cleanUpdates).length > 0) {
          await this.supabase.from('mentors').update(cleanUpdates).eq('id', id);
        }
      } catch (e) {
        console.warn('Supabase mentor update warning:', e);
      }
    }

    return { mentor: updated };
  }

  async deleteMentor(id: string): Promise<{ error?: string }> {
    const list = this._mentors$.value.filter(m => m.id !== id);
    this._mentors$.next(list);

    if (this.supabase.isConfigured) {
      try {
        await this.supabase.from('mentors').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase mentor delete error:', e);
      }
    }

    return {};
  }

  addHOD(hodData: Partial<HOD>, password?: string): { hod?: HOD; error?: string } {
    const existing = this._hods$.value.find(h => h.email.toLowerCase() === hodData.email?.toLowerCase());
    if (existing) {
      return { error: `HOD with email ${hodData.email} already exists.` };
    }

    const newId = `h-${Date.now()}`;
    const branch = this._branches$.value.find(b => b.id === hodData.branch_id);
    const newHOD: HOD = {
      id: newId,
      user_id: `u-h-${Date.now()}`,
      employee_id: hodData.employee_id || `EMP-H${Math.floor(100 + Math.random() * 900)}`,
      full_name: hodData.full_name!,
      email: hodData.email!,
      branch_id: hodData.branch_id!,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      branch
    };

    const current = this._hods$.value;
    this._hods$.next([newHOD, ...current]);

    const initialPass = password || 'techwing@123';
    this.authService.registerUserAccount({
      email: hodData.email!,
      pass: initialPass,
      full_name: hodData.full_name!,
      role: 'hod'
    });

    if (this.supabase.isConfigured) {
      const { branch: _b, ...dbHOD } = newHOD;
      this.supabase.from('hods').insert([dbHOD]).then(({ error }) => {
        if (error) console.warn('Supabase HOD insert error:', error);
      });
    }

    return { hod: newHOD };
  }

  async updateHOD(id: string, updates: Partial<HOD>, password?: string): Promise<{ hod?: HOD; error?: string }> {
    const list = [...this._hods$.value];
    const index = list.findIndex(h => h.id === id);
    if (index === -1) return { error: 'HOD not found' };

    const updated: HOD = {
      ...list[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (updates.branch_id) updated.branch = this._branches$.value.find(b => b.id === updates.branch_id);

    list[index] = updated;
    this._hods$.next(list);

    if (password && updated.email) {
      this.authService.registerUserAccount({
        email: updated.email,
        pass: password,
        full_name: updated.full_name,
        role: 'hod'
      });
    }

    if (this.supabase.isConfigured) {
      try {
        const { branch: _b, ...cleanUpdates } = updates;
        if (Object.keys(cleanUpdates).length > 0) {
          await this.supabase.from('hods').update(cleanUpdates).eq('id', id);
        }
      } catch (e) {
        console.warn('Supabase HOD update warning:', e);
      }
    }

    return { hod: updated };
  }

  async deleteHOD(id: string): Promise<{ error?: string }> {
    const list = this._hods$.value.filter(h => h.id !== id);
    this._hods$.next(list);

    if (this.supabase.isConfigured) {
      try {
        await this.supabase.from('hods').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase HOD delete error:', e);
      }
    }

    return {};
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<{ student?: Student; error?: string }> {
    const list = [...this._students$.value];
    const index = list.findIndex(s => s.id === id);
    if (index === -1) return { error: 'Student not found' };

    const updated = {
      ...list[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (updates.branch_id) updated.branch = this._branches$.value.find(b => b.id === updates.branch_id);
    if (updates.batch_id) updated.batch = this._batches$.value.find(b => b.id === updates.batch_id);

    list[index] = updated;
    this._students$.next(list);

    if (this.supabase.isConfigured) {
      try {
        const { branch: _b, batch: _bt, mentor: _m, hod: _h, qr_code: _qr, ...cleanUpdates } = updates;
        if (Object.keys(cleanUpdates).length > 0) {
          await this.supabase.from('students').update(cleanUpdates).eq('id', id);
        }
      } catch (e) {
        console.warn('Supabase update warning:', e);
      }
    }

    return { student: updated };
  }

  async deleteStudent(id: string): Promise<{ error?: string }> {
    const list = this._students$.value.filter(s => s.id !== id);
    this._students$.next(list);

    if (this.supabase.isConfigured) {
      try {
        await this.supabase.from('qr_codes').delete().eq('student_id', id);
        await this.supabase.from('students').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase delete error:', e);
      }
    }

    return {};
  }

  async bulkImport(rows: StudentImportRow[]): Promise<ImportResult> {
    const result: ImportResult = {
      total: rows.length,
      valid: 0,
      duplicates: 0,
      invalid: 0,
      imported: 0,
      errors: []
    };

    const currentStudents = this._students$.value;
    const existingRolls = new Set(currentStudents.map(s => s.roll_number.toLowerCase()));
    const existingEmails = new Set(currentStudents.map(s => s.email.toLowerCase()));

    const newStudents: Student[] = [];

    rows.forEach((row, i) => {
      const rowNum = i + 1;
      const errors: string[] = [];

      if (!row.roll_number) errors.push('Missing Roll Number');
      if (!row.full_name) errors.push('Missing Student Name');
      if (!row.email) errors.push('Missing Email');

      if (row.roll_number && existingRolls.has(row.roll_number.toLowerCase())) {
        errors.push(`Duplicate Roll Number: ${row.roll_number}`);
        result.duplicates++;
      }

      if (row.email && existingEmails.has(row.email.toLowerCase())) {
        errors.push(`Duplicate Email: ${row.email}`);
        result.duplicates++;
      }

      if (errors.length > 0) {
        result.invalid++;
        errors.forEach(err => result.errors.push({ row: rowNum, field: 'Validation', message: err }));
      } else {
        result.valid++;
        existingRolls.add(row.roll_number.toLowerCase());
        existingEmails.add(row.email.toLowerCase());

        const branch = this._branches$.value.find(b => b.code.toLowerCase() === (row.branch_code || 'CSE').toLowerCase()) || this._branches$.value[0];
        const batch = this._batches$.value.find(b => b.name.toLowerCase() === (row.batch_name || 'Batch 01').toLowerCase()) || this._batches$.value[0];

        const studId = `STU-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        const newStud: Student = {
          id: `stu-imp-${Date.now()}-${i}`,
          student_id: studId,
          roll_number: row.roll_number,
          full_name: row.full_name,
          email: row.email,
          phone: row.phone || '',
          gender: (row.gender as any) || 'male',
          branch_id: branch.id,
          batch_id: batch.id,
          combo_name: row.combo_name || 'AWS + AGENTIC-AI',
          year: Number(row.year) || 1,
          semester: Number(row.semester) || 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          branch,
          batch,
          qr_code: {
            id: `qr-imp-${Date.now()}-${i}`,
            student_id: `stu-imp-${Date.now()}-${i}`,
            token: `token-uuid-${Math.floor(100000 + Math.random() * 900000)}`,
            is_active: true,
            generated_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }
        };

        newStudents.push(newStud);
      }
    });

    if (newStudents.length > 0) {
      this._students$.next([...newStudents, ...currentStudents]);
      result.imported = newStudents.length;

      if (this.supabase.isConfigured) {
        try {
          const dbStudents = newStudents.map(s => {
            const { branch: _b, batch: _bt, mentor: _m, hod: _h, qr_code: _qr, ...dbStud } = s;
            return dbStud;
          });
          const dbQrs = newStudents.filter(s => s.qr_code).map(s => ({
            id: s.qr_code!.id,
            student_id: s.id,
            token: s.qr_code!.token,
            is_active: true,
            generated_at: s.qr_code!.generated_at,
            created_at: s.qr_code!.created_at
          }));
          await this.supabase.from('students').insert(dbStudents);
          await this.supabase.from('qr_codes').insert(dbQrs);
        } catch (e) {
          console.warn('Supabase bulk import sync error:', e);
        }
      }
    }

    return result;
  }
}
