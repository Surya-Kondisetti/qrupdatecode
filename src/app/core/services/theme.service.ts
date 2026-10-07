import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private _isDarkMode$ = new BehaviorSubject<boolean>(false);
  isDarkMode$ = this._isDarkMode$.asObservable();

  constructor() {
    const savedTheme = localStorage.getItem('tw_theme');
    if (savedTheme) {
      this.setDarkMode(savedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setDarkMode(prefersDark);
    }
  }

  get isDarkMode(): boolean {
    return this._isDarkMode$.value;
  }

  toggleDarkMode(): void {
    this.setDarkMode(!this.isDarkMode);
  }

  toggleTheme(): void {
    this.toggleDarkMode();
  }

  setDarkMode(isDark: boolean): void {
    this._isDarkMode$.next(isDark);
    localStorage.setItem('tw_theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
}
