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
import { first, map, share, shareReplay } from 'rxjs';
import { DirectMonitorService } from '../../services/direct-monitor.service';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '../../pipes/translate.pipe';

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
  ],
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltersComponent {
  filtersService = inject(FiltersService);
  controls = inject(FiltersControlService);
  directMonitorService = inject(DirectMonitorService);

  minMaxKwp = this.directMonitorService.monitor.pipe(
    map((data) => {
      const kwp = data.map((item) => item.kwp);
      return { min: Math.min(...kwp), max: Math.max(...kwp) };
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  portals = this.directMonitorService.portals;

  minMaxKwp$ = this.filtersService.getMinMaxKwp().pipe(share());

  systemStatuses = ['Active', 'Inactive'];

  tags = ['Compensation', 'Retrofit'];
  tag = [this.tags[0], this.tags[1]];

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
