import {Component, inject} from '@angular/core';
import {CommonModule} from "@angular/common";
import {FiltersComponent} from "../filters/filters.component";
import {HeaderComponent} from "../header/header.component";
import {MatButtonModule} from "@angular/material/button";
import {MatTableModule
} from "@angular/material/table";
import {MatIconModule} from "@angular/material/icon";
import {MatMenuModule} from "@angular/material/menu";
import {MatSortModule, Sort} from "@angular/material/sort";
import {ActivatedRoute, Router, RouterOutlet} from '@angular/router';
import {MatCard} from '@angular/material/card';
import {DataService} from '../../data.service';
import {map, Observable, startWith} from 'rxjs';

@Component({
  selector: 'app-systems-page',
  standalone: true,
    imports: [
      [
        CommonModule,
        RouterOutlet,
        MatTableModule,
        MatIconModule,
        MatSortModule,
        MatCard,
        MatButtonModule, MatMenuModule, FiltersComponent, HeaderComponent
      ]
    ],
  templateUrl: './systems-page.component.html',
  styleUrl: './systems-page.component.css'
})
export class SystemsPageComponent {
  dataService = inject(DataService);

  data: Observable<any[]> = this.dataService.getSystemsData().pipe(
    map((data) => data || []),
    startWith([])
  );

  displayedColumns: string[] = [
    'notes',
    'actions',
    'openAlerts',
    'clearedAlerts',
    'startOfYear',
    'startOfMonth',
    'lastMonth',
    'today',
    'monthly',
    'weekly',
    'threeDays',
    'yesterday',
    'communication',
    'portal',
    'KWP',
    'name',
    'tested',
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  onSort(sortState: Sort) {
    const direction = sortState.direction
      ? `${sortState.active},${sortState.direction}`
      : '';

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort: direction },
      queryParamsHandling: 'merge',
    });
  }
}
