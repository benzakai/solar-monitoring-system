import { Routes } from '@angular/router';
import { SystemSettingsComponent } from './system-settings.component';

export const SYSTEM_SETTINGS_ROUTES: Routes = [
  {
    path: '',
    component: SystemSettingsComponent,
  },
  {
    path: ':id',
    component: SystemSettingsComponent,
  },
]; 