import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MentorDashboardComponent } from './mentor-dashboard.component';
import { QrScannerComponent } from './qr-scanner.component';
import { TodayAttendanceComponent } from './today-attendance.component';
import { CorrectionRequestsComponent } from './correction-requests.component';

const routes: Routes = [
  { path: 'dashboard', component: MentorDashboardComponent },
  { path: 'scanner', component: QrScannerComponent },
  { path: 'today', component: TodayAttendanceComponent },
  { path: 'corrections', component: CorrectionRequestsComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MentorRoutingModule { }
