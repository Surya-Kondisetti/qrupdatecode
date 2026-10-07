import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login.component';
import { GuestGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }
