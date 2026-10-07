import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import { StudentService } from '../services/student.service';
import { AttendanceService } from '../services/attendance.service';
import { UserRole } from '../../models';
import { Session } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
  must_change_password?: boolean;
}

export interface OTPState {
  email: string;
  otpCode: string;
  expiresAt: number;
  userToLogin: AuthUser;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _currentUser$ = new BehaviorSubject<AuthUser | null>(null);
  private _loading$ = new BehaviorSubject<boolean>(true);

  currentUser$ = this._currentUser$.asObservable();
  loading$ = this._loading$.asObservable();

  // Active 2FA OTP State
  private activeOTP: OTPState | null = null;
  public pendingUserForPasswordChange: AuthUser | null = null;

  // Primary Admin & Registered User Accounts
  private userAccounts: Map<string, { pass: string; user: AuthUser }> = new Map([
    [
      'suryakondisetti@ggu.edu.in',
      {
        pass: 'techwing@ac.in',
        user: {
          id: 'admin-primary-1',
          email: 'suryakondisetti@ggu.edu.in',
          role: 'admin',
          full_name: 'Surya Kondisetti (Admin)',
          must_change_password: false
        }
      }
    ]
  ]);

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private injector: Injector
  ) {
    this.loadUserAccountsFromStorage();
    this.initDefaultAccountsIfEmpty();
    this.initSession();
  }

  private initDefaultAccountsIfEmpty(): void {
    if (this.userAccounts.size <= 1) {
      this.registerUserAccount({ email: 'suryakondisetti@ggu.edu.in', pass: 'techwing@ac.in', full_name: 'Surya Kondisetti (Admin)', role: 'admin' });
      this.registerUserAccount({ email: 'mentor@techwing.edu', pass: 'techwing@123', full_name: 'Dr. Ramesh Kumar (Mentor)', role: 'mentor' });
      this.registerUserAccount({ email: 'hod@techwing.edu', pass: 'techwing@123', full_name: 'Dr. Anita Sharma (HOD)', role: 'hod' });
      this.registerUserAccount({ email: 'student@techwing.edu', pass: 'techwing@123', full_name: 'Rahul Varma (Student)', role: 'student' });
    }
  }

  get currentUser(): AuthUser | null {
    return this._currentUser$.value;
  }

  get isAuthenticated(): boolean {
    return !!this._currentUser$.value;
  }

  get role(): UserRole | null {
    return this._currentUser$.value?.role ?? null;
  }

  get isAdmin(): boolean { return this.role === 'admin'; }
  get isMentor(): boolean { return this.role === 'mentor'; }
  get isHOD(): boolean { return this.role === 'hod'; }
  get isStudent(): boolean { return this.role === 'student'; }

  private async initSession(): Promise<void> {
    try {
      // Restore active user session from localStorage on page refresh
      const savedUserRaw = localStorage.getItem('techwing_logged_in_user');
      if (savedUserRaw) {
        try {
          const savedUser = JSON.parse(savedUserRaw);
          this._currentUser$.next(savedUser);
          this.refreshServicesFromSupabase();
        } catch (e) {
          // ignore
        }
      }

      if (this.supabase.isConfigured) {
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
          await this.loadUserProfile(session);
        }
      }
    } catch (err) {
      console.warn('Session init warning:', err);
    } finally {
      this._loading$.next(false);
    }

    try {
      if (this.supabase.isConfigured) {
        this.supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            await this.loadUserProfile(session);
          } else if (event === 'SIGNED_OUT') {
            this.setCurrentUser(null);
          }
        });
      }
    } catch (e) {
      // ignore
    }
  }

  private setCurrentUser(user: AuthUser | null): void {
    this._currentUser$.next(user);
    if (user) {
      try {
        localStorage.setItem('techwing_logged_in_user', JSON.stringify(user));
      } catch (e) {
        // ignore
      }
    } else {
      localStorage.removeItem('techwing_logged_in_user');
    }
  }

  private async loadUserProfile(session: Session): Promise<void> {
    try {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profile) {
        this.setCurrentUser({
          id: session.user.id,
          email: session.user.email!,
          role: profile.role as UserRole,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          must_change_password: profile.must_change_password || false
        });
        return;
      }
    } catch (err) {
      console.warn('Profile load warning:', err);
    }

    const role = (session.user.user_metadata?.['role'] as UserRole) || 'student';
    const name = session.user.user_metadata?.['full_name'] || session.user.email?.split('@')[0] || 'User';
    this.setCurrentUser({
      id: session.user.id,
      email: session.user.email!,
      role: role,
      full_name: name,
      must_change_password: false
    });
  }

  // Register Mentor / HOD / Student account created by Admin
  registerUserAccount(acc: { email: string; pass: string; full_name: string; role: UserRole }): void {
    const emailKey = acc.email.toLowerCase().trim();
    const newUser: AuthUser = {
      id: `u-${Date.now()}`,
      email: emailKey,
      role: acc.role,
      full_name: acc.full_name,
      must_change_password: true
    };
    this.userAccounts.set(emailKey, { pass: acc.pass, user: newUser });
    this.saveUserAccountsToStorage();
  }

  private saveUserAccountsToStorage(): void {
    try {
      const arr = Array.from(this.userAccounts.entries());
      localStorage.setItem('techwing_user_accounts', JSON.stringify(arr));
    } catch (e) {
      // ignore
    }
  }

  private loadUserAccountsFromStorage(): void {
    try {
      const raw = localStorage.getItem('techwing_user_accounts');
      if (raw) {
        const arr = JSON.parse(raw);
        arr.forEach(([k, v]: [string, any]) => {
          this.userAccounts.set(k, v);
        });
      }
    } catch (e) {
      // ignore
    }
  }

  async login(identifier: string, password: string): Promise<{ error: string | null; requires2FA?: boolean; email?: string; otpDemoCode?: string }> {
    this.loadUserAccountsFromStorage();
    let email = identifier.trim().toLowerCase();

    // 1. Primary HR Admin login
    if (email === 'suryakondisetti@ggu.edu.in') {
      if (password !== 'techwing@ac.in') {
        return { error: 'Invalid password for Admin' };
      }
      return this.send2FAOTP('suryakondisetti@ggu.edu.in', {
        id: 'admin-primary-1',
        email: 'suryakondisetti@ggu.edu.in',
        role: 'admin',
        full_name: 'Surya Kondisetti (Admin)',
        must_change_password: false
      });
    }

    // 2. Check registered accounts created by Admin or stored in memory
    let foundAcc = this.userAccounts.get(email);
    if (!foundAcc) {
      for (const [eKey, acc] of this.userAccounts.entries()) {
        if (eKey.includes(email) || acc.user.email.includes(email)) {
          foundAcc = acc;
          email = eKey;
          break;
        }
      }
    }

    // 3. Dynamic lookup from Supabase tables (students, mentors, hods) if not found in memory
    if (!foundAcc && this.supabase.isConfigured) {
      try {
        const [sRes, mRes, hRes] = await Promise.all([
          this.supabase.from('students').select('*').or(`email.ilike.${email},roll_number.ilike.${email},student_id.ilike.${email}`).maybeSingle(),
          this.supabase.from('mentors').select('*').or(`email.ilike.${email},employee_id.ilike.${email}`).maybeSingle(),
          this.supabase.from('hods').select('*').or(`email.ilike.${email},employee_id.ilike.${email}`).maybeSingle()
        ]);

        if (sRes.data) {
          const s = sRes.data;
          const user: AuthUser = {
            id: s.id,
            email: s.email,
            role: 'student',
            full_name: s.full_name,
            must_change_password: false
          };
          this.registerUserAccount({ email: s.email, pass: password, full_name: s.full_name, role: 'student' });
          return this.send2FAOTP(s.email, user);
        }

        if (mRes.data) {
          const m = mRes.data;
          const user: AuthUser = {
            id: m.id,
            email: m.email,
            role: 'mentor',
            full_name: m.full_name,
            must_change_password: false
          };
          this.registerUserAccount({ email: m.email, pass: password, full_name: m.full_name, role: 'mentor' });
          return this.send2FAOTP(m.email, user);
        }

        if (hRes.data) {
          const h = hRes.data;
          const user: AuthUser = {
            id: h.id,
            email: h.email,
            role: 'hod',
            full_name: h.full_name,
            must_change_password: false
          };
          this.registerUserAccount({ email: h.email, pass: password, full_name: h.full_name, role: 'hod' });
          return this.send2FAOTP(h.email, user);
        }
      } catch (err) {
        console.warn('Supabase account lookup error:', err);
      }
    }

    if (foundAcc) {
      if (foundAcc.pass !== password) {
        return { error: 'Invalid email/ID or password' };
      }
      return this.send2FAOTP(email, foundAcc.user);
    }

    // 4. Supabase Auth fallback
    if (this.supabase.isConfigured) {
      try {
        const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
        if (!error && data.session) {
          const authUser: AuthUser = {
            id: data.session.user.id,
            email: data.session.user.email!,
            role: (data.session.user.user_metadata?.['role'] as UserRole) || 'student',
            full_name: data.session.user.user_metadata?.['full_name'] || email.split('@')[0],
            must_change_password: false
          };
          return this.send2FAOTP(email, authUser);
        }
      } catch (err: any) {
        // ignore
      }
    }

    return { error: 'Invalid email, Roll Number/ID, or password' };
  }

  // Generate & Dispatch 2FA OTP
  send2FAOTP(email: string, userToLogin: AuthUser): { error: null; requires2FA: true; email: string; otpDemoCode: string } {
    const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    this.activeOTP = {
      email,
      otpCode: generatedOTP,
      expiresAt: Date.now() + 5 * 60 * 1000,
      userToLogin
    };

    console.log(`[2FA OTP Dispatcher] Email sent to ${email} with OTP: ${generatedOTP}`);

    return {
      error: null,
      requires2FA: true,
      email,
      otpDemoCode: generatedOTP
    };
  }

  // Verify 2FA OTP Code
  verify2FAOTP(otpCode: string): { success: boolean; error?: string; mustChangePassword?: boolean } {
    if (!this.activeOTP) {
      return { success: false, error: 'OTP session expired. Please login again.' };
    }

    if (Date.now() > this.activeOTP.expiresAt) {
      this.activeOTP = null;
      return { success: false, error: 'OTP has expired. Please request a new OTP.' };
    }

    if (this.activeOTP.otpCode !== otpCode.trim()) {
      return { success: false, error: 'Incorrect 6-digit OTP code.' };
    }

    const targetUser = this.activeOTP.userToLogin;
    this.activeOTP = null;

    if (targetUser.must_change_password) {
      this.pendingUserForPasswordChange = targetUser;
      return { success: true, mustChangePassword: true };
    }

    this.setCurrentUser(targetUser);
    this.refreshServicesFromSupabase();
    this.redirectByRole();
    return { success: true, mustChangePassword: false };
  }

  public async refreshServicesFromSupabase(): Promise<void> {
    try {
      const studentService = this.injector.get(StudentService);
      const attendanceService = this.injector.get(AttendanceService);
      if (studentService) await studentService.loadAllFromSupabase();
      if (attendanceService) await attendanceService.initAttendanceData();
    } catch (e) {
      console.warn('Service refresh warning:', e);
    }
  }

  // First-time Password Change before dashboard entry
  changePasswordBeforeLogin(newPassword: string): { success: boolean; error?: string } {
    const user = this.pendingUserForPasswordChange || this.currentUser;
    if (!user) {
      return { success: false, error: 'Session error' };
    }

    user.must_change_password = false;
    const acc = this.userAccounts.get(user.email.toLowerCase());
    if (acc) {
      acc.pass = newPassword;
      acc.user.must_change_password = false;
      this.saveUserAccountsToStorage();
    }

    this.pendingUserForPasswordChange = null;
    this.setCurrentUser({ ...user });
    this.refreshServicesFromSupabase();
    this.redirectByRole();
    return { success: true };
  }

  async logout(): Promise<void> {
    try {
      if (this.supabase.isConfigured) {
        await this.supabase.auth.signOut();
      }
    } catch (e) {
      // ignore
    }
    this.setCurrentUser(null);
    this.pendingUserForPasswordChange = null;
    this.activeOTP = null;
    this.router.navigate(['/login']);
  }

  async resetPassword(email: string): Promise<{ error: string | null }> {
    if (!this.supabase.isConfigured) {
      return { error: null };
    }
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      return { error: error?.message ?? null };
    } catch (e: any) {
      return { error: e?.message ?? 'Reset failed' };
    }
  }

  redirectByRole(): void {
    const role = this.role;
    switch (role) {
      case 'admin': this.router.navigate(['/admin/dashboard']); break;
      case 'mentor': this.router.navigate(['/mentor/dashboard']); break;
      case 'hod': this.router.navigate(['/hod/dashboard']); break;
      case 'student': this.router.navigate(['/student/dashboard']); break;
      default: this.router.navigate(['/login']);
    }
  }

  hasRole(...roles: UserRole[]): boolean {
    return roles.includes(this.role as UserRole);
  }

  // Get user password by email
  getUserPassword(email: string): string {
    this.loadUserAccountsFromStorage();
    const acc = this.userAccounts.get(email.toLowerCase().trim());
    return acc ? acc.pass : 'techwing@123';
  }

  // Update Profile Details & Password for any role (Student, Mentor, HOD, Admin)
  async updateUserProfileAndPassword(
    targetEmail: string,
    details: { full_name?: string; phone?: string; email?: string },
    newPassword?: string
  ): Promise<{ success: boolean; error?: string }> {
    this.loadUserAccountsFromStorage();
    const oldEmailKey = targetEmail.toLowerCase().trim();
    const newEmailKey = (details.email || targetEmail).toLowerCase().trim();

    let acc = this.userAccounts.get(oldEmailKey);
    if (!acc) {
      const curr = this.currentUser;
      acc = {
        pass: newPassword || 'techwing@123',
        user: {
          id: curr?.id || `u-${Date.now()}`,
          email: newEmailKey,
          role: curr?.role || 'student',
          full_name: details.full_name || curr?.full_name || 'User',
          must_change_password: false
        }
      };
    }

    if (details.full_name) acc.user.full_name = details.full_name;
    if (details.email) acc.user.email = details.email;
    if (newPassword && newPassword.trim().length >= 6) {
      acc.pass = newPassword.trim();
      acc.user.must_change_password = false;
    }

    if (oldEmailKey !== newEmailKey) {
      this.userAccounts.delete(oldEmailKey);
    }
    this.userAccounts.set(newEmailKey, acc);
    this.saveUserAccountsToStorage();

    // If active logged-in user updated their profile
    if (this.currentUser && (this.currentUser.email.toLowerCase() === oldEmailKey || this.currentUser.id === acc.user.id)) {
      const updatedUser: AuthUser = {
        ...this.currentUser,
        full_name: acc.user.full_name,
        email: acc.user.email
      };
      this.setCurrentUser(updatedUser);
    }

    // Sync to Supabase
    if (this.supabase.isConfigured) {
      try {
        await this.supabase.from('profiles').upsert({
          id: acc.user.id,
          user_id: acc.user.id,
          full_name: acc.user.full_name,
          phone: details.phone || '',
          role: acc.user.role,
          updated_at: new Date().toISOString()
        });

        if (acc.user.role === 'student') {
          const updateObj: any = { full_name: acc.user.full_name, email: acc.user.email };
          if (details.phone) updateObj.phone = details.phone;
          await this.supabase.from('students').update(updateObj).eq('email', oldEmailKey);
        } else if (acc.user.role === 'mentor') {
          const updateObj: any = { full_name: acc.user.full_name, email: acc.user.email };
          if (details.phone) updateObj.phone = details.phone;
          await this.supabase.from('mentors').update(updateObj).eq('email', oldEmailKey);
        } else if (acc.user.role === 'hod') {
          const updateObj: any = { full_name: acc.user.full_name, email: acc.user.email };
          if (details.phone) updateObj.phone = details.phone;
          await this.supabase.from('hods').update(updateObj).eq('email', oldEmailKey);
        }
      } catch (err) {
        console.warn('Supabase profile/password update error:', err);
      }
    }

    return { success: true };
  }
}
