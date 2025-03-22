import { createAction, props } from '@ngrx/store';
import { Malfunction } from '../../domain/malfunction';

export const loadAllMalfunctions = createAction('[Malfunctions] Load All');

export const setMalfunctionsStatus = createAction(
  '[Malfunctions] Set Status',
  props<{ status: 'open' | 'closed' }>()
);

export const loadMalfunctionsSuccess = createAction(
  '[Malfunctions] Load All Success',
  props<{ items: Malfunction[]; clean?: boolean }>()
);

export const setClosedLoadingStatus = createAction(
  '[Malfunctions] Set Closed Loading Status',
  props<{ status: 'LOADING' | 'LOADED' | 'ERROR' }>()
);

export const loadMalfunctionsFailure = createAction(
  '[Malfunctions] Load All Failure',
  props<{ error: string }>()
);
