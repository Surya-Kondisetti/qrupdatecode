import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserRole } from '../../../models';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { NotificationService } from '../../../core/services/notification.service';
import { Notification } from '../../../models';

@Component({
  selector: 'app-header-nav',
  templateUrl: './header-nav.component.html',
  styleUrls: ['./header-nav.component.scss']
})
export class HeaderNavComponent implements OnInit {
  currentUser: AuthUser | null = null;
  isDarkMode = false;
  showNotifications = false;
  showUserMenu = false;
  unreadNotificationsCount = 0;
  notificationsList: Notification[] = [];

  // Profile Edit & Password Change Modal State
  showProfileModal = false;
  profileForm!: FormGroup;
  showPass = false;
  savingProfile = false;

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    public notificationService: NotificationService,
    private toastService: ToastService,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.themeService.isDarkMode$.subscribe(dark => {
      this.isDarkMode = dark;
    });

    this.notificationService.notifications$.subscribe(list => {
      this.notificationsList = list;
    });

    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadNotificationsCount = count;
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showUserMenu = false;
  }

  markNotificationRead(id: string): void {
    this.notificationService.markAsRead(id);
  }

  markAllNotificationsRead(): void {
    this.notificationService.markAllAsRead();
  }

  clearNotifications(): void {
    this.notificationService.clearAll();
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;
  }

  openProfileModal(): void {
    this.showUserMenu = false;
    if (!this.currentUser) return;
    this.profileForm = this.fb.group({
      full_name: [this.currentUser.full_name, Validators.required],
      email: [this.currentUser.email, [Validators.required, Validators.email]],
      phone: [''],
      newPassword: [''],
      confirmPassword: ['']
    });
    this.showProfileModal = true;
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
  }

  async saveProfile(): Promise<void> {
    if (!this.profileForm || this.profileForm.invalid || !this.currentUser) {
      this.toastService.showWarning('Please enter valid profile details');
      return;
    }

    const { full_name, email, phone, newPassword, confirmPassword } = this.profileForm.value;

    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        this.toastService.showWarning('Password must be at least 6 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        this.toastService.showWarning('New password and confirmation do not match.');
        return;
      }
    }

    this.savingProfile = true;
    try {
      const res = await this.authService.updateUserProfileAndPassword(
        this.currentUser.email,
        { full_name, email, phone },
        newPassword || undefined
      );

      if (res.success) {
        this.toastService.showSuccess('Profile & security credentials updated successfully!');
        this.closeProfileModal();
      } else {
        this.toastService.showError(res.error || 'Failed to update profile');
      }
    } catch (err: any) {
      this.toastService.showError('Error updating profile');
    } finally {
      this.savingProfile = false;
    }
  }

  switchRole(role: UserRole): void {
    const email = `${role}@techwing.edu`;
    this.authService.login(email, 'demo123');
    this.toastService.showSuccess(`Switched active view to ${role.toUpperCase()} role`);
    this.showUserMenu = false;
  }

  logout(): void {
    this.authService.logout();
    this.toastService.showInfo('Logged out successfully');
  }
}
