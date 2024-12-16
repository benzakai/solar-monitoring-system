import { createReducer, on } from '@ngrx/store';
import { loadMonitorItemsSuccess } from './monitor.actions';
import { MonitorItem } from '../../domain/monitor-item';

export interface MonitorState {
  monitorItems: MonitorItem[];
}

export const initialState: MonitorState = {
  monitorItems: [],
};

export const monitorReducer = createReducer(
  initialState,
  on(loadMonitorItemsSuccess, (state, { monitorItems }) => {
    const updatedState = [...state.monitorItems];

    monitorItems.forEach((updatedItem) => {
      const index = updatedState.findIndex(
        (item) => item.id === updatedItem.id
      );
      if (index !== -1) {
        updatedState[index] = updatedItem;
      } else {
        updatedState.push(updatedItem);
      }
    });

    return {
      ...state,
      monitorItems: updatedState,
    };
  })
);
