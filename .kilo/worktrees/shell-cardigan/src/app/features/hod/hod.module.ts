import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { HodRoutingModule } from './hod-routing.module';

import { HodDashboardComponent } from './hod-dashboard.component';
import { ReportsCenterComponent } from './reports-center.component';

@NgModule({
  declarations: [
    HodDashboardComponent,
    ReportsCenterComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    HodRoutingModule
  ]
})
export class HodModule { }
