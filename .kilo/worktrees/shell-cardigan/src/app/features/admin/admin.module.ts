import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';

import { AdminDashboardComponent } from './admin-dashboard.component';
import { StudentManagementComponent } from './student-management.component';
import { StudentImportComponent } from './student-import.component';
import { QrStudioComponent } from './qr-studio.component';
import { AttendanceMasterComponent } from './attendance-master.component';
import { ArchivesManagerComponent } from './archives-manager.component';

@NgModule({
  declarations: [
    AdminDashboardComponent,
    StudentManagementComponent,
    StudentImportComponent,
    QrStudioComponent,
    AttendanceMasterComponent,
    ArchivesManagerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    AdminRoutingModule
  ]
})
export class AdminModule { }
