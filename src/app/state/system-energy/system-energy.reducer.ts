import { Energy } from '../../domain/energy';
import { createReducer, on } from '@ngrx/store';
import {
  loadSystemEnergyItem,
  loadSystemEnergyItemFailure,
  loadSystemEnergyItemSuccess,
} from './system-energy.actions';

export type SystemEnergyState = Partial<Energy> & {
  loading?: boolean;
};

export const initialState: SystemEnergyState = {
  loading: false,
};

export const systemEnergyReducer = createReducer(
  initialState,
  on(loadSystemEnergyItem, (state) => ({
    ...state,
    loading: true,
  })),
  on(loadSystemEnergyItemSuccess, (state, { energy }) => ({
    ...state,
    ...(energy || {}),
    loading: false,
  })),
  on(loadSystemEnergyItemFailure, (state) => ({
    ...state,
    loading: false,
  }))
);
