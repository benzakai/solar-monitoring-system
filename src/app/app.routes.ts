import { Routes } from '@angular/router';
import {SystemsPageComponent} from './components/systems-page/systems-page.component';
import {LoginPageComponent} from './components/login-page/login-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'systems', pathMatch: 'full' },
  { path: 'systems', component: SystemsPageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: '**', redirectTo: 'systems' }
];
