import { EnergyState } from './energy.reducer';
import { createFeatureSelector, createSelector } from '@ngrx/store';

const selectEnergyState = createFeatureSelector<EnergyState>('energy');
export const selectEnergyItems = createSelector(
  selectEnergyState,
  (state: EnergyState) => state.energyItems
);
