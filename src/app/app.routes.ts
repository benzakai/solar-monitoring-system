import { Routes } from '@angular/router';
import { MonitoringTableComponent } from './features/monitoring/components/monitoring-table/monitoring-table.component';
import { LoginPageComponent } from './core/login-page/login-page.component';
import { UpdateCheckComponent } from './features/energy/components/update-check/update-check.component';
import { UpdatePartitionComponent } from './features/energy/components/update-partition/update-partition.component';
import { SystemDetailsComponent } from './features/monitoring/components/system-details/system-details.component';
import { MalfuncitonEditComponent } from './features/malfunctions/malfunciton-edit/malfunciton-edit.component';
import { MalfunctionsComponent } from './features/malfunctions/malfunctions/malfunctions.component';
import { RoutineCheckComponent } from './features/monitoring/components/routine-check/routine-check.component';

export const routes: Routes = [
  { path: '', redirectTo: 'systems', pathMatch: 'full' },
  { path: 'systems', component: MonitoringTableComponent },
  { path: 'system/:id', component: SystemDetailsComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'energy-update-check', component: UpdateCheckComponent },
  { path: 'energy-update-partition', component: UpdatePartitionComponent },
  { path: 'malfunctions', component: MalfunctionsComponent },
  { path: 'malfunction-edit/:id', component: MalfuncitonEditComponent },
  { path: 'routine-check', component: RoutineCheckComponent },
  { path: '**', redirectTo: 'systems' },
];
