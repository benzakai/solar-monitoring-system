import { ActionReducerMap, provideStore } from '@ngrx/store';
import { monitorReducer } from './monitor/monitor.reducer';
import { provideEffects } from '@ngrx/effects';
import { MonitorEffects } from './monitor/monitor.effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { EnvironmentProviders, isDevMode } from '@angular/core';
import { energyReducer } from './energy/energy.reducer';
import { EnergyEffects } from './energy/energy.effects';
import { systemEnergyReducer } from './system-energy/system-energy.reducer';
import { SystemEnergyEffects } from './system-energy/system-energy.effects';

export interface State {}

export const reducers: ActionReducerMap<State> = {
  monitor: monitorReducer,
  energy: energyReducer,
  systemEnergy: systemEnergyReducer,
};

const devTools: EnvironmentProviders[] = isDevMode()
  ? [provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() })]
  : [];

export const storeProviders: EnvironmentProviders[] = [
  provideStore(reducers),
  provideEffects(MonitorEffects, EnergyEffects, SystemEnergyEffects),
  ...devTools,
];
