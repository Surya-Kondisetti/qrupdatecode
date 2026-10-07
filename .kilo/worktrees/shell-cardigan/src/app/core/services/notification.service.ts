import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Notification, NotificationType } from '../../models';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private _notifications$ = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this._notifications$.asObservable();

  private _unreadCount$ = new BehaviorSubject<number>(0);
  public unreadCount$ = this._unreadCount$.asObservable();

  constructor(private toastService: ToastService) {
    this.initNotifications();
  }

  private initNotifications(): void {
    const saved = localStorage.getItem('techwing_user_notifications');
    if (saved) {
      try {
        const parsed: Notification[] = JSON.parse(saved);
        this._notifications$.next(parsed);
        this.updateUnreadCount(parsed);
        return;
      } catch (e) {
        // ignore
      }
    }

    // Default initial notification feed
    const defaultNotis: Notification[] = [
      {
        id: 'n1',
        user_id: 'all',
        type: 'session_opened',
        title: 'Morning Attendance Active',
        message: 'Morning session scanner is active for student verification until 11:00 AM.',
        is_read: false,
        created_at: new Date(Date.now() - 10 * 60000).toISOString()
      },
      {
        id: 'n2',
        user_id: 'all',
        type: 'low_attendance',
        title: 'Low Attendance Threshold Notice',
        message: '5 students in CSE Batch 01 dropped below the 75% minimum threshold.',
        is_read: false,
        created_at: new Date(Date.now() - 60 * 60000).toISOString()
      },
      {
        id: 'n3',
        user_id: 'all',
        type: 'monthly_report',
        title: 'September 2026 Archive Compiled',
        message: 'Monthly report archive is ready for view and offline download.',
        is_read: true,
        created_at: new Date(Date.now() - 24 * 3600000).toISOString()
      }
    ];

    this.saveNotifications(defaultNotis);
  }

  private saveNotifications(list: Notification[]): void {
    this._notifications$.next(list);
    this.updateUnreadCount(list);
    try {
      localStorage.setItem('techwing_user_notifications', JSON.stringify(list));
    } catch (e) {
      // ignore
    }
  }

  private updateUnreadCount(list: Notification[]): void {
    const count = list.filter(n => !n.is_read).length;
    this._unreadCount$.next(count);
  }

  get notifications(): Notification[] {
    return this._notifications$.value;
  }

  get unreadCount(): number {
    return this._unreadCount$.value;
  }

  addNotification(
    type: NotificationType,
    title: string,
    message: string,
    actionUrl?: string,
    userId: string = 'all'
  ): Notification {
    const newNoti: Notification = {
      id: `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: userId,
      type,
      title,
      message,
      is_read: false,
      action_url: actionUrl,
      created_at: new Date().toISOString()
    };

    const current = [newNoti, ...this._notifications$.value];
    this.saveNotifications(current);

    // Also trigger in-app toast
    this.toastService.showInfo(title, message);

    return newNoti;
  }

  markAsRead(id: string): void {
    const list = this._notifications$.value.map(n =>
      n.id === id ? { ...n, is_read: true } : n
    );
    this.saveNotifications(list);
  }

  markAllAsRead(): void {
    const list = this._notifications$.value.map(n => ({ ...n, is_read: true }));
    this.saveNotifications(list);
    this.toastService.showSuccess('Notifications Updated', 'All notifications marked as read.');
  }

  clearAll(): void {
    this.saveNotifications([]);
    this.toastService.showInfo('Notifications Cleared');
  }

  deleteNotification(id: string): void {
    const list = this._notifications$.value.filter(n => n.id !== id);
    this.saveNotifications(list);
  }
}
