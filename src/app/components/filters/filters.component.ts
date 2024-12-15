import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { FiltersService } from '../../services/filters.service';
import { FiltersControlService } from '../../services/filters-control.service';
import { ReactiveFormsModule } from '@angular/forms';
import { filter, first, map, share } from 'rxjs';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Store } from '@ngrx/store';
import { selectMinMaxKwp } from '../../state/monitor/monitor.selectors';
import { MatListItem } from '@angular/material/list';

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
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltersComponent {
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
    UNKNOWN_CODE_REFU: 'Refu',
    UNKNOWN_CODE_TIGO: 'Tigo',
    SGR: 'Sun Grow',
    GW: 'Growatt',
    UNKNOWN_CODE_NETECO: 'Neteco',
    UNKNOWN_CODE_SOLAX: 'Solax',
    UNKNOWN_CODE_GOODWE: 'Goodwe',
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
}
