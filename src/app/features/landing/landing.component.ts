import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {
  activeTab = 'home';
  currentYear = new Date().getFullYear();

  constructor(
    public themeService: ThemeService,
    public authService: AuthService,
    private router: Router
  ) {}

  toggleTheme(): void {
    this.themeService.toggleDarkMode();
  }

  navigateToLogin(): void {
    if (this.authService.isAuthenticated) {
      this.authService.redirectByRole();
    } else {
      this.router.navigate(['/login']);
    }
  }
}
