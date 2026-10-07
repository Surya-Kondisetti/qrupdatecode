import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { StudentManagementComponent } from './student-management.component';
import { StudentImportComponent } from './student-import.component';
import { QrStudioComponent } from './qr-studio.component';
import { AttendanceMasterComponent } from './attendance-master.component';
import { ArchivesManagerComponent } from './archives-manager.component';

const routes: Routes = [
  { path: 'dashboard', component: AdminDashboardComponent },
  { path: 'students', component: StudentManagementComponent },
  { path: 'import', component: StudentImportComponent },
  { path: 'qr-designer', component: QrStudioComponent },
  { path: 'attendance', component: AttendanceMasterComponent },
  { path: 'archives', component: ArchivesManagerComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
