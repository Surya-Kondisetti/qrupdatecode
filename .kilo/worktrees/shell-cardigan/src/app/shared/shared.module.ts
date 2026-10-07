import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';

import { HeaderNavComponent } from './components/header-nav/header-nav.component';

@NgModule({
  declarations: [
    ToastContainerComponent,
    HeaderNavComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ToastContainerComponent,
    HeaderNavComponent
  ]
})
export class SharedModule { }
