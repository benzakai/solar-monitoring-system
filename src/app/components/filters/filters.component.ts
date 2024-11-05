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
  portals = ['Portal 1', 'Portal 2', 'Portal 3'];
  tags = ['Compensation', 'Retrofit'];
  regions = ['Germany', 'France', 'USA', 'Japan'];
  customers = ['Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace'];
  systems = ['System 1', 'System 2', 'System 3', 'System 4', 'System 5'];
}
