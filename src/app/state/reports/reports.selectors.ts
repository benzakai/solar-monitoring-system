import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State } from './reducer';

export const selectClientState = createFeatureSelector<State>('client');

export const selectSelectedDate = createSelector(
  selectClientState,
  (state: State) => state.selectedDate
);

export const selectClients = createSelector(
  selectClientState,
  (state: State) => state.clients
);

export const selectSystemsByClientId = createSelector(
  selectClientState,
  (state: State) => state.systemsByClientId
);

export const selectReportsByClientId = createSelector(
  selectClientState,
  (state: State) => state.reportsByClientId
);

export const selectEmailsByClientId = createSelector(
  selectClientState,
  (state: State) => state.emailsByClientId
);
