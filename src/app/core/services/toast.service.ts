import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  leaving?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts$ = new BehaviorSubject<Toast[]>([]);
  toasts$ = this._toasts$.asObservable();

  private add(type: ToastType, title: string, message?: string, duration = 4000): void {
    const id = crypto.randomUUID();
    const toast: Toast = { id, type, title, message, duration };
    this._toasts$.next([...this._toasts$.value, toast]);

    setTimeout(() => this.dismiss(id), duration);
  }

  success(title: string, message?: string): void {
    this.add('success', title, message);
  }

  showSuccess(title: string, message?: string): void {
    this.success(title, message);
  }

  error(title: string, message?: string): void {
    this.add('error', title, message, 6000);
  }

  showError(title: string, message?: string): void {
    this.error(title, message);
  }

  warning(title: string, message?: string): void {
    this.add('warning', title, message, 5000);
  }

  showWarning(title: string, message?: string): void {
    this.warning(title, message);
  }

  info(title: string, message?: string): void {
    this.add('info', title, message);
  }

  showInfo(title: string, message?: string): void {
    this.info(title, message);
  }

  dismiss(id: string): void {
    // Animate out first
    const toasts = this._toasts$.value.map(t =>
      t.id === id ? { ...t, leaving: true } : t
    );
    this._toasts$.next(toasts);

    setTimeout(() => {
      this._toasts$.next(this._toasts$.value.filter(t => t.id !== id));
    }, 300);
  }

  dismissAll(): void {
    this._toasts$.next([]);
  }
}
