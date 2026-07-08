import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { filter, first, map, share } from 'rxjs';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngrx/store';
import { MatListItem } from '@angular/material/list';
import { FiltersService } from '../../services/filters.service';
import { FiltersControlService } from '../../services/filters-control.service';
import { selectMinMaxKwp } from '../../../../state/monitor/monitor.selectors';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSelectModule,
    MatSliderModule,
    MatCheckboxModule,
    MatInputModule,
    MatIcon,
    TranslatePipe,
    MatListItem,
  ],
  templateUrl: './monitoring-filters.component.html',
  styleUrl: './monitoring-filters.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitoringFiltersComponent {
  filtersService = inject(FiltersService);
  controls = inject(FiltersControlService);
  store = inject(Store);

  minMaxKwp = this.store.select(selectMinMaxKwp);

  minMaxKwp$ = this.filtersService.getMinMaxKwp().pipe(share());

  systemStatuses = [
    'status_active_with_issues',
    'status_active_without_issues',
    'status_inactive',
  ];

  allContractsSelected = this.controls.contractsControlState.pipe(
    filter(Boolean),
    map((contracts) =>
      this.controls.contracts.every((c) => contracts.includes(c))
    )
  );

  tags = this.controls.contractsOptions;
  tag = [];

  portalNames: { [k: string]: string } = {
    SE: 'Solar Edge',
    SMA: 'SMA',
    ENX: 'Ennex',
    HWI: 'Huawei',
    MTC: 'Meteo Control',
    RFU: 'Refu',
    TGO: 'Tigo',
    SGR: 'Sun Grow',
    GW: 'Growatt',
    NTC: 'Neteco',
    SLX: 'Solax',
    GDW: 'Goodwe',
    FSN: 'Fusion',
  };
  portalsList: string[] = Object.keys(this.portalNames);

  numberOfSystems = this.controls.systemsControlState.pipe(
    map((systems) => systems?.length || 'All')
  );

  numberOfClients = this.controls.clientsControlState.pipe(
    map((systems) => systems?.length || 'All')
  );

  numberOfRegions = this.controls.regionsControlState.pipe(
    map((systems) => systems?.length || 'All')
  );

  constructor() {
    this.minMaxKwp$
      .pipe(first())
      .subscribe(({ min, max }) =>
        this.controls.kwpControl.setValue([min, max])
      );
  }

  minUpdate(val: number) {
    this.controls.kwpControl.setValue([val, this.controls.kwpControl.value[1]]);
  }

  maxUpdate(val: number) {
    this.controls.kwpControl.setValue([this.controls.kwpControl.value[0], val]);
  }

  compareByEntityId = (a: any, b: any): boolean => {
    if (!a && !b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    return (a._id || a.id) === (b._id || b.id);
  };
}
