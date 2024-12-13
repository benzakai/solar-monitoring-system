import { MonitorState } from './monitor.reducer';
import { createFeatureSelector, createSelector } from '@ngrx/store';

const selectMonitorState = createFeatureSelector<MonitorState>('monitor');
export const selectMonitorItems = createSelector(
  selectMonitorState,
  (state) => state.monitorItems || []
);

export const selectMinMaxKwp = createSelector(selectMonitorItems, (items) => {
  const kwp = items.map((item) => item.kwp);
  return { min: Math.min(...kwp), max: Math.max(...kwp) };
});
