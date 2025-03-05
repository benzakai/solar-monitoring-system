import { createAction, props } from '@ngrx/store';
import { Energy } from '../../domain/energy';

export const loadSystemEnergyItem = createAction(
  '[SystemEnergy] Load System Energy Items',
  props<{ id: string }>()
);

export const loadSystemEnergyItemSuccess = createAction(
  '[SystemEnergy] Load System Energy Items Success',
  props<{ energy: Energy | null }>()
);

export const loadSystemEnergyItemFailure = createAction(
  '[SystemEnergy] Load System Energy Items Failure',
  props<{ error: string }>()
);
