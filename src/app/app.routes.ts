import { Routes } from '@angular/router';
import { MonitoringTableComponent } from './features/monitoring/components/monitoring-table/monitoring-table.component';
import { LoginPageComponent } from './core/login-page/login-page.component';
import { UpdateCheckComponent } from './features/energy/components/update-check/update-check.component';
import { UpdatePartitionComponent } from './features/energy/components/update-partition/update-partition.component';
import { SystemDetailsComponent } from './features/monitoring/components/system-details/system-details.component';
import { MalfuncitonEditComponent } from './features/malfunctions/malfunciton-edit/malfunciton-edit.component';
import { MalfunctionsComponent } from './features/malfunctions/malfunctions/malfunctions.component';
import { RoutineCheckComponent } from './features/monitoring/components/routine-check/routine-check.component';
import { ReportsTableComponent } from './features/reports/components/reports-table/reports-table.component';
import { ReportPreviewComponent } from './features/reports/components/report-preview/report-preview.component';
import { USERS_ROUTES } from './features/users/users.routes';
import { SYSTEM_SETTINGS_ROUTES } from './features/system-settings/system-settings.routes';
import { WashesComponent } from './features/washes/washes.component';
import { ClientDetailsComponent } from './features/clients/client-details.component';
import { ClientsComponent } from './features/clients/clients.component';
import { ManagementComponent } from './features/management/management.component';
import { SettingsComponent } from './features/settings/settings.component';
import { authGuard } from './core/roles/auth.guard';
import { adminGuard } from './core/roles/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'systems', pathMatch: 'full' },
  { path: 'systems', component: MonitoringTableComponent, canActivate: [authGuard] },
  { path: 'system/:id', component: SystemDetailsComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginPageComponent },
  { path: 'energy-update-check', component: UpdateCheckComponent, canActivate: [authGuard] },
  {
    path: 'energy-update-partition',
    component: UpdatePartitionComponent,
    canActivate: [authGuard],
  },
  { path: 'malfunctions', component: MalfunctionsComponent, canActivate: [authGuard] },
  {
    path: 'malfunction-edit/:id',
    component: MalfuncitonEditComponent,
    canActivate: [authGuard],
  },
  { path: 'routine-check', component: RoutineCheckComponent, canActivate: [authGuard] },
  { path: 'reports', component: ReportsTableComponent, canActivate: [authGuard] },
  { path: 'reports/:year', component: ReportsTableComponent, canActivate: [authGuard] },
  {
    path: 'reports/:year/:month',
    component: ReportsTableComponent,
    canActivate: [authGuard],
  },
  { path: 'report-preview/:id/:botpass', component: ReportPreviewComponent },
  { path: 'report-preview/:id', component: ReportPreviewComponent },
  { path: 'report-preview', component: ReportPreviewComponent },
  { path: 'management', component: ManagementComponent, canActivate: [authGuard, adminGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard, adminGuard] },
  {
    path: 'users',
    canActivate: [authGuard, adminGuard],
    canActivateChild: [authGuard, adminGuard],
    children: USERS_ROUTES,
  },
  {
    path: 'system-settings',
    canActivate: [authGuard, adminGuard],
    canActivateChild: [authGuard, adminGuard],
    children: SYSTEM_SETTINGS_ROUTES,
  },
  { path: 'clients', component: ClientsComponent, canActivate: [authGuard] },
  { path: 'client/:id', component: ClientDetailsComponent, canActivate: [authGuard] },
  { path: 'washes', component: WashesComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'systems' },
];
