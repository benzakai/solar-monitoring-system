import { Routes } from '@angular/router';
import { MonitoringTableComponent } from './features/monitoring/components/monitoring-table/monitoring-table.component';
import { LoginPageComponent } from './core/login-page/login-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'systems', pathMatch: 'full' },
  { path: 'systems', component: MonitoringTableComponent },
  { path: 'login', component: LoginPageComponent },
  { path: '**', redirectTo: 'systems' },
];
