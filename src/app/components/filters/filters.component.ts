import {Component, inject} from '@angular/core';
import {MatSelectModule} from '@angular/material/select';
import {MatSliderModule} from '@angular/material/slider';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIcon} from '@angular/material/icon';
import {FiltersService} from '../../services/filters.service';
import {FiltersControlService} from '../../services/filters-control.service';
import {ReactiveFormsModule} from '@angular/forms';
import {first, share} from 'rxjs';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatSelectModule, MatSliderModule, MatCheckboxModule, MatIcon],
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.css'
})
export class FiltersComponent {
  filtersService = inject(FiltersService);
  controls = inject(FiltersControlService);
  minMaxKwp$ = this.filtersService.getMinMaxKwp().pipe(
    share()
  );

  systemStatuses = ['Active', 'Inactive', 'Pending', 'Suspended'];
  systemStatus = [this.systemStatuses[0]];

  portals = ['Portal 1', 'Portal 2', 'Portal 3'];
  portal = [this.portals[0]];

  tags = ['Compensation', 'Retrofit'];
  tag = [this.tags[0], this.tags[1]];

  regions = ['Germany', 'France', 'USA', 'Japan'];
  region = [this.regions[0]];

  customers = ['Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace'];
  customer = [this.customers[0]];

  systems = ['System 1', 'System 2', 'System 3', 'System 4', 'System 5'];
  system = [this.systems[0]];

  constructor() {
    this.minMaxKwp$.pipe(first()).subscribe(({  min, max}) => this.controls.kwpControl.setValue([min, max]));
  }

  minUpdate(val: number) {
    this.controls.kwpControl.setValue([val, this.controls.kwpControl.value[1]]);
  }

  maxUpdate(val: number) {
    this.controls.kwpControl.setValue([this.controls.kwpControl.value[0], val]);
  }
}
