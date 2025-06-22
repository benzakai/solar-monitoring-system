import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { WashesService } from './washes.service';
import { MonitorFacade } from '../../state/monitor/monitor.facade';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MonitoringFiltersComponent } from '../monitoring/components/monitoring-filters/monitoring-filters.component';
import { HeaderComponent } from '../../core/header/header.component';
import { IssuesCountPipe } from '../monitoring/pipes/issues-count.pipe';
import { SortHeaderComponent } from '../monitoring/components/sort-header/sort-header.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '../../core/lang/translate.pipe';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WashRow } from './WashRow';
import { BehaviorSubject, combineLatest, filter, map, shareReplay } from 'rxjs';
import { SystemsWashService } from './systems-wash.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EnergyService } from '../../endpoint/energy.service';
import { MatCheckbox } from '@angular/material/checkbox';

@Component({
  selector: 'app-washes',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatIconModule,
    MatSortModule,
    MatCardModule,
    MatPaginator,
    MatButtonModule,
    MatMenuModule,
    MonitoringFiltersComponent,
    HeaderComponent,
    IssuesCountPipe,
    SortHeaderComponent,
    MatTooltipModule,
    TranslatePipe,
    MatProgressSpinnerModule,
    DatePipe,
    MatCheckbox,
  ],
  templateUrl: './washes.component.html',
  styleUrl: './washes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WashesComponent implements OnInit {
  washesService = inject(WashesService);
  monitorFacade = inject(MonitorFacade);
  systemsWashService = inject(SystemsWashService);
  energyService = inject(EnergyService);

  destroyRef = inject(DestroyRef);

  activeSort = new BehaviorSubject({
    sortField: 'lastWashDate',
    sortDirection: 'desc',
  });

  sortParams = this.activeSort.pipe(
    map(({ sortField, sortDirection }) => ({
      sortField,
      sortDirection: sortDirection === 'asc' ? 1 : -1,
    }))
  );

  dataSource = new MatTableDataSource<WashRow>();
  displayedColumns = [
    'addWash',
    'comment',
    'numOfWashes',
    'washDone',
    'supplier',
    'nextWash',

    'lastWashDate',
    'sinceLastWash',
    'week3',
    'week2',
    'week1',
    'potential',
    'washRate',

    'KWP',
    'washType',
    'name',
    'clientName',
  ];

  @ViewChild(MatSort) sort: MatSort | null = null;

  washesRows = combineLatest([
    this.monitorFacade.monitorItems,
    this.washesService.getWashes(),
  ]).pipe(
    takeUntilDestroyed(this.destroyRef),
    filter(([monitorItems, washes]) => Boolean(monitorItems && washes)),
    map(([monitorItems, washes]) => {
      const washesMap = new Map(washes.map((wash) => [wash.id, wash]));

      return monitorItems.map((item) => {
        const washData = washesMap.get(item.id);

        return new WashRow(item, washData);
      });
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  sortedRows = combineLatest([this.washesRows, this.sortParams]).pipe(
    map(([rows, sorts]) =>
      [...rows].sort((a, b) => {
        const isAsc = sorts.sortDirection === 1;
        switch (sorts.sortField) {
          case 'lastWashDate':
            return this.compare(
              a.lastWashDate || 0,
              b.lastWashDate || 0,
              isAsc
            );
          default:
            return 0;
        }
      })
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  compare(a: any, b: any, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  ngOnInit() {
    this.sortedRows.subscribe((rows) => (this.dataSource.data = rows));
  }

  trackTable(index: number, item: WashRow) {
    return item?.system?.id;
  }

  onSort(sortState: Sort) {
    this.activeSort.next({
      sortDirection: sortState.direction,
      sortField: sortState.active,
    });
  }

  washTypes: any = {
    0: 'ללא שטיפות',
    3: '3 שטיפות',
    4: '4 שטיפות',
    5: '5 שטיפות',
    6: '6 שטיפות',
    1: 'שטיפות בודדות',
  };
}
