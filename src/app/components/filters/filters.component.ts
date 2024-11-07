import { Component } from '@angular/core';
import {MatSelectModule} from '@angular/material/select';
import {MatSliderModule} from '@angular/material/slider';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule, MatSelectModule, MatSliderModule, MatCheckboxModule],
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.css'
})
export class FiltersComponent {
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
}
