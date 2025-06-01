import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe, JsonPipe, NgForOf } from '@angular/common';
import { MatFormField } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption } from '@angular/material/core';
import { MatSelect, MatSelectTrigger } from '@angular/material/select';
import { MatSlider, MatSliderRangeThumb } from '@angular/material/slider';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/lang/translate.pipe';
import { FiltersService } from '../../monitoring/services/filters.service';
import { FiltersControlService } from '../../monitoring/services/filters-control.service';
import { Store } from '@ngrx/store';
import { selectMinMaxKwp } from '../../../state/monitor/monitor.selectors';
import { filter, first, map, share } from 'rxjs';
import { MalfunctionsFiltersControlService } from '../../monitoring/services/malfunctions-filters-control.service';

@Component({
  selector: 'app-malfunctions-filters',
  standalone: true,
  imports: [
    AsyncPipe,
    MatFormField,
    MatIcon,
    MatInput,
    MatOption,
    MatSelect,
    MatSelectTrigger,
    MatSlider,
    MatSliderRangeThumb,
    NgForOf,
    ReactiveFormsModule,
    TranslatePipe,
    JsonPipe,
  ],
  templateUrl: './malfunctions-filters.component.html',
  styleUrl: './malfunctions-filters.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MalfunctionsFiltersComponent {
  controls = inject(MalfunctionsFiltersControlService);
  store = inject(Store);

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
}
