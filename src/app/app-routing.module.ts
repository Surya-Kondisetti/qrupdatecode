import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadChildren: () => import('./features/landing/landing.module').then(m => m.LandingModule)
  },
  {
    path: '',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule)
  },
  {
    path: 'mentor',
    loadChildren: () => import('./features/mentor/mentor.module').then(m => m.MentorModule)
  },
  {
    path: 'hod',
    loadChildren: () => import('./features/hod/hod.module').then(m => m.HodModule)
  },
  {
    path: 'student',
    loadChildren: () => import('./features/student/student.module').then(m => m.StudentModule)
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled', useHash: false })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
