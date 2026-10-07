import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HodDashboardComponent } from './hod-dashboard.component';
import { ReportsCenterComponent } from './reports-center.component';

const routes: Routes = [
  { path: 'dashboard', component: HodDashboardComponent },
  { path: 'department', component: HodDashboardComponent },
  { path: 'alerts', component: HodDashboardComponent },
  { path: 'reports', component: ReportsCenterComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HodRoutingModule { }
