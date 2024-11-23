import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FiltersComponent } from '../filters/filters.component';
import { HeaderComponent } from '../header/header.component';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule, Sort } from '@angular/material/sort';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { MatCard } from '@angular/material/card';
import { DataService } from '../../data.service';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FiltersControlService } from '../../services/filters-control.service';
import { DirectMonitorService } from '../../services/direct-monitor.service';
import { IssuesCountPipe } from '../../pipes/issues-count.pipe';
import {map, Observable, shareReplay} from 'rxjs';

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
      MatPaginator,
      MatButtonModule,
      MatMenuModule,
      FiltersComponent,
      HeaderComponent,
      IssuesCountPipe,
    ],
  ],
  templateUrl: './systems-page.component.html',
  styleUrl: './systems-page.component.css',
  providers: [FiltersControlService, DataService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemsPageComponent {
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

  dataSource = new MatTableDataSource<any>();

  directMonitorService = inject(DirectMonitorService);
  monitor = this.directMonitorService.getAll().pipe(
    map((data) => data || []),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  monitorFiltered = this.monitor.pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );

  monitorFilteredCount = this.monitor.pipe(
    map((data) => data.length),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  minMaxKwp = this.monitor.pipe(
    map((data) => {
      const kwp = data.map((item) => item.kwp);
      return [Math.min(...kwp), Math.max(...kwp)];
    })
  );

  portals = this.monitor.pipe(
    map((data) => Array.from(new Set(data.map((item) => item.portal))))
  );

  totalKv = this.monitor.pipe(
    map((data) => data.reduce((acc, item) => acc + item.kwp, 0))
  );

  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef
  ) {}

  ngAfterViewInit() {
    this.monitor.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.dataSource.data = data;
    });
  }

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
