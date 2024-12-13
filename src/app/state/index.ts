import { ActionReducerMap, provideStore } from '@ngrx/store';
import { monitorReducer } from './monitor/monitor.reducer';
import { provideEffects } from '@ngrx/effects';
import { MonitorEffects } from './monitor/monitor.effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { EnvironmentProviders, isDevMode } from '@angular/core';

export interface State {}

export const reducers: ActionReducerMap<State> = {
  monitor: monitorReducer,
};

const devTools: EnvironmentProviders[] = isDevMode()
  ? [provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() })]
  : [];

export const storeProviders: EnvironmentProviders[] = [
  provideStore(reducers),
  provideEffects(MonitorEffects),
  ...devTools,
];
