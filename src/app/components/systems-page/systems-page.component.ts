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
import { MatPaginator } from '@angular/material/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FiltersControlService } from '../../services/filters-control.service';
import {DirectMonitorService, MonitorItem} from '../../services/direct-monitor.service';
import { IssuesCountPipe } from '../../pipes/issues-count.pipe';
import {map, shareReplay, combineLatest} from 'rxjs';
import {TranslatePipe} from '../../pipes/translate.pipe';

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
    TranslatePipe,
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
    'today_comparable',
    'communication',
    'portal',
    'KWP',
    'name',
    'tested',
  ];

  filtersControls = inject(FiltersControlService);

  dataSource = new MatTableDataSource<any>();

  directMonitorService = inject(DirectMonitorService);

  monitorFiltered = combineLatest([
    this.filtersControls.kwpControlState,
    this.filtersControls.portalControlState,
    this.filtersControls.activityControlState,
    this.filtersControls.systemsControlStateMap,
    this.filtersControls.clientsControlStateMap,
    this.directMonitorService.monitor,
  ]).pipe(
    map(([kwp, portals, activity, systems, clients, data]) => {
      const filters: Array<(item: MonitorItem) => boolean> = [];

      if (kwp?.length) {
        filters.push((item) => item.kwp >= kwp[0] && item.kwp <= kwp[1]);
      }

      if (portals?.length) {
        filters.push((item) => portals.includes(item.portal));
      }

      if (activity?.length) {
        filters.push((item) => activity.includes(item.system_active));
      }

      if (Object.keys(systems).length) {
        filters.push((item) => systems[item.id]);
      }

      if (Object.keys(clients).length) {
        filters.push((item) => clients[item.client.id]);
      }

      return data.filter((item) => filters.every((filter) => filter(item)));
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  monitorFilteredCount = this.monitorFiltered.pipe(
    map((data) => data.length),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  totalKv = this.monitorFiltered.pipe(
    map((data) => data.reduce((acc, item) => acc + item.kwp, 0))
  );

  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef
  ) {
    this.monitorFiltered
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
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
