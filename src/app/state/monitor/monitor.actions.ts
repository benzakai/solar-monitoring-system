import { createAction, props } from '@ngrx/store';
import { MonitorItem } from '../../domain/monitor-item';

export const loadMonitorItemsSuccess = createAction(
  '[Monitor] Load Monitor Items Success',
  props<{ monitorItems: MonitorItem[] }>()
);

export const loadMonitorItemsFailure = createAction(
  '[Monitor] Load Monitor Items Failure',
  props<{ error: string }>()
);
