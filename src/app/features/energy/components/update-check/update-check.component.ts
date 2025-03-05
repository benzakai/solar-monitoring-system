import { Component, inject } from '@angular/core';
import { EnergyService } from '../../../../endpoint/energy.service';
import { map, shareReplay, take } from 'rxjs';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { SystemApiService } from '../../../systems/system-api.service';
import { EnergyErrorsService } from '../../../../endpoint/energy-error.service';

@Component({
  selector: 'app-update-check',
  standalone: true,
  imports: [AsyncPipe, JsonPipe],
  templateUrl: './update-check.component.html',
  styleUrl: './update-check.component.css',
})
export class UpdateCheckComponent {
  public energyService = inject(EnergyService);
  public systemApiService = inject(SystemApiService);
  public energyErrorsService = inject(EnergyErrorsService);

  public updates = this.energyService.getOldEnergyRecords().pipe(
    map((data) =>
      data?.map((d) => ({
        id: d.id,
        time: d['#modified'],
        date: new Date(d['#modified']).toISOString(),
      }))
    ),
    map((data) => data.sort((a, b) => b.time - a.time)),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  public updatesCount1 = this.updates.pipe(map((updates) => updates.length));

  public errors = this.energyErrorsService.getOf('2025-01-27_15');
  public errorsCount = this.errors.pipe(
    map((errors) => errors?.failedSystems?.length)
  );
  constructor() {}

  navigateToSystemApi(systemId: string) {
    this.systemApiService
      .redirectToSystemApi(systemId)
      .pipe(take(1))
      .subscribe();
  }
}
