import { createReducer, on } from '@ngrx/store';
import { Malfunction } from '../../domain/malfunction';
import {
  loadMalfunctionsSuccess,
  loadRemovedMalfunctionsSuccess,
  setClosedLoadingStatus,
  setMalfunctionsStatus,
} from './malfunctions.actions';

export type StoreDataStatus = 'LOADED' | 'LOADING' | 'ERROR' | undefined;

export interface MalfunctionsState {
  statuses: ('open' | 'closed')[];
  openStatus?: StoreDataStatus;
  closeStatus?: StoreDataStatus;
  items: Partial<Malfunction>[];
}

export const initialMalfunctionsState: MalfunctionsState = {
  items: [],
  statuses: [],
};

const millisecondsOfDay = 1000 * 60 * 60 * 24;
const calcDays = (closeTime: any, openTime: any) => {
  if (!openTime) {
    return 0;
  }
  const close = closeTime ? new Date(closeTime).getTime() : Date.now();
  const open = new Date(openTime).getTime();
  return Math.floor((close - open) / millisecondsOfDay);
};

export const malfunctionsReducer = createReducer(
  initialMalfunctionsState,
  on(loadMalfunctionsSuccess, (state, { items, clean }) => {
    const updated = [...state.items];

    const mapped = items.map((item) => ({
      ...item,
      days: calcDays(item.closeTime, item.openTime),
    }));

    if (clean) {
      return {
        ...state,
        items: [...mapped],
      };
    }

    if (updated?.length) {
      mapped.forEach((newItem) => {
        const index = updated.findIndex((item) => item.id === newItem.id);
        if (index >= 0) {
          updated[index] = newItem;
        } else {
          updated.push(newItem);
        }
      });
      return {
        ...state,
        items: updated,
      };
    } else {
      return {
        ...state,
        items: [...mapped],
      };
    }
  }),
  on(setMalfunctionsStatus, (state, { status }) => {
    if (state.statuses.includes(status)) {
      return state;
    } else {
      return {
        ...state,
        statuses: [...state.statuses, status],
      };
    }
  }),
  on(setClosedLoadingStatus, (state, { status }) => {
    return {
      ...state,
      closeStatus: status,
    };
  }),
  on(loadRemovedMalfunctionsSuccess, (state, { items }) => {
    return {
      ...state,
      items: state.items.filter(
        (stateItem) => !items.find((item) => item.id === stateItem.id)
      ),
    };
  })
);
