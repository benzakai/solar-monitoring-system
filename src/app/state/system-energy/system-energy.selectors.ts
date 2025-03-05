import { createFeatureSelector } from '@ngrx/store';
import { SystemEnergyState } from './system-energy.reducer';

export const systemEnergyState =
  createFeatureSelector<SystemEnergyState>('systemEnergy');
