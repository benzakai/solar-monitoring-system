import { Energy } from '../../domain/energy';
import { createReducer, on } from '@ngrx/store';
import { loadEnergyItemsSuccess } from './energy.actions';

export interface EnergyState {
  energyItems: Partial<Energy>[];
}

export const initialEnergyState: EnergyState = {
  energyItems: [],
};

export const energyReducer = createReducer(
  initialEnergyState,
  on(loadEnergyItemsSuccess, (state, { energyItems }) => {
    const updated = [...state.energyItems];

    if (updated?.length) {
      energyItems.forEach((energyItem) => {
        const index = updated.findIndex((item) => item.id === energyItem.id);
        if (index >= 0) {
          updated[index] = energyItem;
        } else {
          updated.push(energyItem);
        }
      });
      return {
        ...state,
        energyItems: updated,
      };
    } else {
      return {
        ...state,
        energyItems: [...energyItems],
      };
    }
  })
);
