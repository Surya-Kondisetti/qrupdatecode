import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  showPassword = false;
  showForgotPasswordModal = false;
  forgotEmail = '';
  forgotLoading = false;
  returnUrl = '/';

  // 2FA OTP Verification State
  show2FAModal = false;
  otpCode = '';
  otpLoading = false;
  otpEmail = '';
  lastDispatchedOTP = '';

  // First Login Password Change State
  showPasswordChangeModal = false;
  newPassword = '';
  confirmPassword = '';
  changePasswordLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toast: ToastService,
    public themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required]],
      rememberMe: [true]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.value;

    try {
      const res = await this.authService.login(email, password);

      if (res.error) {
        this.toast.error('Authentication Failed', res.error);
      } else if (res.requires2FA) {
        this.otpEmail = res.email || email;
        this.lastDispatchedOTP = res.otpDemoCode || '';
        this.show2FAModal = true;
        this.toast.success('2FA OTP Dispatched!', `Verification OTP sent to ${this.otpEmail}. Code: ${this.lastDispatchedOTP}`);
      }
    } catch (err: any) {
      this.toast.error('System Error', err?.message || 'An unexpected error occurred.');
    } finally {
      this.loading = false;
    }
  }

  autoFillOTP(): void {
    if (this.lastDispatchedOTP) {
      this.otpCode = this.lastDispatchedOTP;
      this.toast.info('OTP Filled', `Auto-filled 2FA verification code: ${this.lastDispatchedOTP}`);
    }
  }

  resendOTP(): void {
    const user = this.authService.currentUser || { id: 'temp', email: this.otpEmail, role: 'admin', full_name: 'User' };
    const res = this.authService.send2FAOTP(this.otpEmail, user as any);
    this.lastDispatchedOTP = res.otpDemoCode;
    this.toast.success('New OTP Sent!', `Fresh verification code sent to ${this.otpEmail}. Code: ${this.lastDispatchedOTP}`);
  }

  verifyOTP(): void {
    if (!this.otpCode || this.otpCode.length < 4) {
      this.toast.warning('Invalid OTP', 'Please enter the 6-digit OTP code sent to your email.');
      return;
    }

    this.otpLoading = true;
    const res = this.authService.verify2FAOTP(this.otpCode);
    this.otpLoading = false;

    if (!res.success) {
      this.toast.error('OTP Failed', res.error || 'Verification failed');
      return;
    }

    this.show2FAModal = false;
    this.otpCode = '';

    if (res.mustChangePassword) {
      this.showPasswordChangeModal = true;
      this.toast.warning('Password Change Required', 'First time login detected. Please set a new secure password.');
    } else {
      this.toast.success('Sign In Successful', '2FA verified. Welcome to TechWing Attendance System.');
    }
  }

  submitNewPassword(): void {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.toast.warning('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.toast.warning('Password Mismatch', 'New password and confirmation do not match.');
      return;
    }

    this.changePasswordLoading = true;
    const res = this.authService.changePasswordBeforeLogin(this.newPassword);
    this.changePasswordLoading = false;

    if (res.success) {
      this.showPasswordChangeModal = false;
      this.toast.success('Password Updated', 'Your new password has been saved. Accessing dashboard...');
    } else {
      this.toast.error('Update Failed', res.error || 'Failed to update password');
    }
  }

  async sendPasswordReset(): Promise<void> {
    if (!this.forgotEmail || !this.forgotEmail.includes('@')) {
      this.toast.warning('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    this.forgotLoading = true;
    const { error } = await this.authService.resetPassword(this.forgotEmail);
    this.forgotLoading = false;

    if (error) {
      this.toast.error('Reset Failed', error);
    } else {
      this.toast.success('Reset Email Sent', 'Check your inbox for password reset instructions.');
      this.showForgotPasswordModal = false;
      this.forgotEmail = '';
    }
  }
}
