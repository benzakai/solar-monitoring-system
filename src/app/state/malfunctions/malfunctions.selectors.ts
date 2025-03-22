import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MalfunctionsState } from './malfunctions.reducer';

const selectMalfunctionsState =
  createFeatureSelector<MalfunctionsState>('malfunctions');
export const selectMalfunctionsItems = createSelector(
  selectMalfunctionsState,
  (state) => state.items || []
);

export const selectMalfunctionsStatuses = createSelector(
  selectMalfunctionsState,
  (state) => state.statuses
);

export const selectIsClosedLoading = createSelector(
  selectMalfunctionsState,
  (state) => state.closeStatus === 'LOADING'
);
