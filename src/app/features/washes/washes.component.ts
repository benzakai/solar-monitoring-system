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
import { MatSortModule, MatSort } from '@angular/material/sort';
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
import { combineLatest, filter } from 'rxjs';
import { SystemsWashService } from './systems-wash.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  ],
  templateUrl: './washes.component.html',
  styleUrl: './washes.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WashesComponent implements OnInit {
  washesService = inject(WashesService);
  monitorFacade = inject(MonitorFacade);
  systemsWashService = inject(SystemsWashService);

  destroyRef = inject(DestroyRef);

  dataSource = new MatTableDataSource<WashRow>();
  displayedColumns = [
    'name',
    'clientName',
    'KWP',
    'washType',
    'lastWashDate',
    'nextWash',
    'supplier',
    'numOfWashes',
    'sinceLastWash',
  ];

  @ViewChild(MatSort) sort: MatSort | null = null;

  constructor() {}

  ngOnInit() {
    combineLatest([
      this.monitorFacade.monitorItems,
      this.washesService.getWashes(),
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(([monitorItems, washes]) => Boolean(monitorItems && washes))
      )
      .subscribe(([monitorItems, washes]) => {
        const washesMap = new Map(washes.map((wash) => [wash.id, wash]));

        const rows = monitorItems.map((item) => {
          const washData = washesMap.get(item.id);

          return new WashRow(item, washData);
        });

        this.dataSource.data = rows;
      });
  }

  trackTable(index: number, item: WashRow) {
    return item?.system?.id;
  }
}
