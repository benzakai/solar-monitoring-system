import { combineLatest, map, of, switchMap } from 'rxjs';
import { System } from '../domain/system';
import { EnergyCalc } from '../core/energy/energy-calculator';
import { MonitorItem } from '../domain/monitor-item';
import { AppPrediction } from '../domain/app';
import { inject, Injectable } from '@angular/core';
import { SystemEnergyFacade } from '../state/system-energy/system-energy.facade';
import { SystemsService } from './systems.service';

@Injectable({
  providedIn: 'root',
})
export class EnvironmentalEnergyService {
  systemEnergyFacade = inject(SystemEnergyFacade);
  systemsService = inject(SystemsService);

  getEnvironmentalEnergies(system: System | null, prediction: AppPrediction) {
    return system?.id
      ? combineLatest([
          this.systemEnergyFacade.getSystemEnergy(system?.id),
          this.systemsService
            .getSystemsByIds(system?.location?.relatedSystems || [])
            .pipe(
              switchMap((relatedSystems) => {
                const relatedMaps: { [k: string]: System } = relatedSystems
                  .filter((s) => EnergyCalc.IsPartOfAverage(s))
                  .reduce((acc, s) => Object.assign(acc, { [s.id]: s }), {});

                return this.systemEnergyFacade
                  .getSystemEnergyList(Object.keys(relatedMaps))
                  .pipe(
                    map((energies) =>
                      energies.map((energy) => ({
                        energy,
                        system: relatedMaps[energy.id],
                      }))
                    )
                  );
              })
            ),
        ]).pipe(
          map(([energy, relatedEnergy]) => ({
            system,
            energy,
            prediction,
            relatedEnergy,
          }))
        )
      : of(null);
  }
}
