import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { loadSystemEnergyItem } from './system-energy.actions';
import { systemEnergyState } from './system-energy.selectors';
import { EnergyService } from '../../endpoint/energy.service';

@Injectable({
  providedIn: 'root',
})
export class SystemEnergyFacade {
  store = inject(Store);
  energyState = inject(EnergyService);

  getSystemEnergy(id: string) {
    this.store.dispatch(loadSystemEnergyItem({ id }));
    return this.store.select(systemEnergyState);
  }

  getSystemEnergyList(ids: string[]) {
    return this.energyState.getEnergyByIds(ids);
  }
}
