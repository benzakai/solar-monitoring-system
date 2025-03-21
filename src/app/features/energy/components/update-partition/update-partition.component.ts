import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectEnergyItems } from '../../../../state/energy/energy.selectors';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { SampleEnergyComponent } from '../sample-energy/sample-energy.component';
import { MonitorFacade } from '../../../../state/monitor/monitor.facade';
import { BehaviorSubject, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MonitorItem } from '../../../../domain/monitor-item';
import {
  ClickedUpdate,
  SelectUpdate,
  SelectUpdateState,
} from './update-partition-selected';
import { loadEnergyItems } from '../../../../state/energy/energy.actions';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-update-partition',
  standalone: true,
  imports: [
    AsyncPipe,
    SampleEnergyComponent,
    MatSlideToggleModule,
    ReactiveFormsModule,
    MatCardModule,
    DecimalPipe,
  ],
  templateUrl: './update-partition.component.html',
  styleUrl: './update-partition.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: SelectUpdate,
      useValue: new BehaviorSubject(null),
    },
    {
      provide: ClickedUpdate,
      useValue: new BehaviorSubject(null),
    },
  ],
})
export class UpdatePartitionComponent {
  store = inject(Store);
  monitor = inject(MonitorFacade);
  allSystems: { [k in string]: MonitorItem } = {};
  selectedUpdate = inject(SelectUpdate);
  clickedUpdate = inject(ClickedUpdate);

  updatedSystem = this.selectedUpdate.pipe(
    map((data) =>
      data ? { ...data, system: this.allSystems[data.systemId] } : null
    )
  );

  clickedSystem = this.clickedUpdate.pipe(
    map((data) =>
      data ? { ...data, system: this.allSystems[data.systemId] } : null
    )
  );

  showActive = new FormControl(true);

  constructor() {
    this.store.dispatch(loadEnergyItems());
    this.monitor.monitor
      .pipe(
        takeUntilDestroyed(),
        map((data) =>
          data.reduce(
            (acc, item) => Object.assign(acc, { [item.id]: item }),
            {}
          )
        )
      )
      .subscribe((systems) => (this.allSystems = systems));
  }

  public shouldShow(systemId: string): boolean {
    return this.allSystems && this.allSystems[systemId]
      ? this.allSystems[systemId].system_active
      : false;
  }

  public items = this.store.select(selectEnergyItems);

  public percent(sample?: SelectUpdateState): string {
    return (
      Math.round(
        (Number(sample?.update?.valueKwh) / Number(sample?.system?.kwp)) * 100
      ) + '%'
    );
  }
}
