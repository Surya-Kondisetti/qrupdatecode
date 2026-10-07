import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { SharedModule } from '../../shared/shared.module';
import { MentorRoutingModule } from './mentor-routing.module';

import { MentorDashboardComponent } from './mentor-dashboard.component';
import { QrScannerComponent } from './qr-scanner.component';
import { TodayAttendanceComponent } from './today-attendance.component';
import { CorrectionRequestsComponent } from './correction-requests.component';

@NgModule({
  declarations: [
    MentorDashboardComponent,
    QrScannerComponent,
    TodayAttendanceComponent,
    CorrectionRequestsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ZXingScannerModule,
    SharedModule,
    MentorRoutingModule
  ]
})
export class MentorModule { }
