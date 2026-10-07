import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { StudentRoutingModule } from './student-routing.module';
import { StudentDashboardComponent } from './student-dashboard.component';

@NgModule({
  declarations: [
    StudentDashboardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    StudentRoutingModule
  ]
})
export class StudentModule { }
