import { createAction, emptyProps, props } from '@ngrx/store';
import { Energy } from '../../domain/energy';

export const loadEnergyItems = createAction('[Energy] Load Energy Items');

export const loadEnergyItemsSuccess = createAction(
  '[Energy] Load Energy Items Success',
  props<{ energyItems: Energy[] }>()
);

export const loadEnergyItemsFailure = createAction(
  '[Energy] Load Energy Items Failure',
  props<{ error: string }>()
);
