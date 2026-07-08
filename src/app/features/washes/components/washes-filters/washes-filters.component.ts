import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { filter, map } from 'rxjs';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngrx/store';
import { MatListItem } from '@angular/material/list';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { FiltersService } from '../../../monitoring/services/filters.service';
import { FiltersControlService } from '../../../monitoring/services/filters-control.service';

@Component({
  selector: 'app-washes-filters',
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
  templateUrl: './washes-filters.component.html',
  styleUrl: './washes-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WashesFiltersComponent {
  filtersService = inject(FiltersService);
  controls = inject(FiltersControlService);
  store = inject(Store);

  allContractsSelected = this.controls.contractsControlState.pipe(
    filter(Boolean),
    map((contracts) =>
      this.controls.contracts.every((c) => contracts.includes(c))
    )
  );

  systemCriteria = {
    COWSHED: 'cowshed',
    FACTORY: 'factory',
    GAS_STATION: 'gasStation',
    HENCOOP: 'hencoop',
    HOUSE: 'house',
    SCHOOL: 'school',
    RESERVOIR: 'reservoir',
    OTHER: 'other',
  };

  criteriaList = Object.values(this.systemCriteria);

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
