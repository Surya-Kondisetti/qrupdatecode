import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StudentDashboardComponent } from './student-dashboard.component';

const routes: Routes = [
  { path: 'dashboard', component: StudentDashboardComponent },
  { path: 'my-qr', component: StudentDashboardComponent },
  { path: 'calendar', component: StudentDashboardComponent },
  { path: 'history', component: StudentDashboardComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StudentRoutingModule { }
