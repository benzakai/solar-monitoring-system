import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule, Sort } from '@angular/material/sort';
import {
  ActivatedRoute,
  Router,
  RouterModule,
  RouterOutlet,
} from '@angular/router';
import { MatCard } from '@angular/material/card';
import { MatPaginator } from '@angular/material/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  map,
  shareReplay,
  combineLatest,
  first,
  debounceTime,
  take,
  startWith,
} from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CreateAlertDialogComponent } from '../create-alert-dialog/create-alert-dialog.component';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import * as XLSX from 'xlsx';
import { HeaderComponent } from '../../../../core/header/header.component';
import { IssuesCountPipe } from '../../pipes/issues-count.pipe';
import { FiltersControlService } from '../../services/filters-control.service';
import { MonitorItem } from '../../../../domain/monitor-item';
import { MonitoringFiltersComponent } from '../monitoring-filters/monitoring-filters.component';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { LANGUAGE } from '../../../../core/lang';
import { SortHeaderComponent } from '../sort-header/sort-header.component';
import { RoutingService } from '../../../../core/routing/routing.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SystemCommentDialogComponent } from '../system-comment-dialog/system-comment-dialog.component';
import { MonitorFacade } from '../../../../state/monitor/monitor.facade';
import { DateUtil } from '../../../../core/date/DateUtil';
import { CurrentUserService } from '../../../people/services/current-user.service';
import { RoutineCheckService } from '../../../../endpoint/routine-check.service';

@Component({
  selector: 'app-monitoring-table',
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
      MatDialogModule,
      MonitoringFiltersComponent,
      HeaderComponent,
      IssuesCountPipe,
      SortHeaderComponent,
      RouterModule,
      MatTooltipModule,
    ],
    TranslatePipe,
    MatProgressSpinner,
  ],
  templateUrl: './monitoring-table.component.html',
  styleUrl: './monitoring-table.component.css',
  providers: [FiltersControlService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitoringTableComponent {
  isRTL = document.documentElement.dir === 'rtl';
  lang = inject(LANGUAGE);
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
  displayedHColumns: string[] = ['l', ...this.displayedColumns, 'r'];
  store = inject(Store);
  filtersControls = inject(FiltersControlService);
  routineCheckService = inject(RoutineCheckService);
  dataSource = new MatTableDataSource<any>();
  route = inject(ActivatedRoute);

  sortParams = this.route.queryParams.pipe(
    startWith({ sort: 'tested,desc' }),
    map((params) => {
      const sort = params['sort'];
      return sort?.split(',') || ['tested', 'desc'];
    }),
    map(([sortField, sortDirection]) => ({
      sortField,
      sortDirection: sortDirection === 'asc' ? 1 : -1,
    }))
  );
  currentUserService = inject(CurrentUserService);
  monitorFacade = inject(MonitorFacade);

  monitorItemsForUser = combineLatest([
    this.monitorFacade.monitorItems.pipe(debounceTime(500)),
    this.currentUserService.user,
  ]).pipe(
    map(([items, user]) =>
      (items || []).map((item) => {
        const daysFromCheck = item?.lastCheck?.date
          ? DateUtil.DaysFromToday(new Date(item?.lastCheck?.date || 0))
          : undefined;
        const checkedByMeToday =
          daysFromCheck === 0 && item?.lastCheck?.uid === user.uid;
        return { ...item, daysFromCheck, checkedByMeToday };
      })
    )
  );

  monitorFiltered = combineLatest([
    this.filtersControls.kwpControlState,
    this.filtersControls.portalControlState,
    this.filtersControls.activityControlState,
    this.filtersControls.systemsControlStateMap,
    this.filtersControls.clientsControlStateMap,
    this.filtersControls.regionsControlStateMap,
    this.filtersControls.contractsControlState,
    this.monitorItemsForUser,
  ]).pipe(
    map(
      ([
        kwp,
        portals,
        activity,
        systems,
        clients,
        regions,
        contracts,
        data,
      ]) => {
        const filters: Array<(item: MonitorItem) => boolean> = [];

        if (kwp?.length) {
          filters.push((item) => item.kwp >= kwp[0] && item.kwp <= kwp[1]);
        }

        if (portals?.length) {
          filters.push((item) => portals.includes(item.portal));
        }

        if (activity?.length) {
          const accepts: Array<(item: MonitorItem) => boolean> = [];
          if (activity.includes('status_active_with_issues')) {
            accepts.push((item) => item.system_active && item.open_issues > 0);
          }
          if (activity.includes('status_active_without_issues')) {
            accepts.push(
              (item) => item.system_active && item.open_issues === 0
            );
          }
          if (activity.includes('status_inactive')) {
            accepts.push((item) => !item.system_active);
          }
          filters.push((item) => accepts.some((filter) => filter(item)));
        } else {
          filters.push((item) => item.system_active);
        }

        if (Object.keys(systems).length) {
          filters.push((item) => systems[item.id]);
        }

        if (Object.keys(clients).length) {
          filters.push((item) =>
            Boolean(item.client?.id && clients[item.client.id])
          );
        }

        if (Object.keys(regions).length) {
          filters.push((item) =>
            (item.region || []).some((ireg: string) => regions[ireg])
          );
        }

        const contractsMap: { [key: string]: boolean } = (
          contracts || []
        ).reduce(
          (acc, item) =>
            Object.assign(acc, { [item === 'no_contract' ? '' : item]: true }),
          {}
        );

        if (contracts?.length) {
          filters.push((item) => contractsMap[item.contract]);
        }

        return data.filter((item) => filters.every((filter) => filter(item)));
      }
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  monitorSorted = combineLatest([this.monitorFiltered, this.sortParams]).pipe(
    map(([filteredData, sortConfig]) => {
      if (sortConfig.sortField) {
        return filteredData.sort((a, b) => {
          // @ts-ignore
          const aValue = a[sortConfig.sortField];
          // @ts-ignore
          const bValue = b[sortConfig.sortField];
          if (aValue < bValue) return -1 * sortConfig.sortDirection;
          if (aValue > bValue) return 1 * sortConfig.sortDirection;
          return 0;
        });
      }
      return filteredData;
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  trackTable(i: number, item: Partial<MonitorItem>) {
    return item?.id;
  }

  monitorFilteredCount = this.monitorFiltered.pipe(
    map((data) => data.length),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  totalKv = this.monitorFiltered.pipe(
    map((data) => data.reduce((acc, item) => acc + item.kwp, 0))
  );

  scrollSize = this.getScrollbarWidth();

  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;

  waitingOpenedIssues: { [key: string]: any } = {};
  waitingComments: { [key: string]: any } = {};
  waitingChecks: { [key: string]: any } = {};

  constructor(
    private router: Router,
    private destroyRef: DestroyRef,
    private elementRef: ElementRef,
    private matDialog: MatDialog,
    private changeDetectorRef: ChangeDetectorRef,
    private routingService: RoutingService
  ) {
    this.monitorSorted
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

  isWaiting(id: string, currentValue: any) {
    if (this.waitingOpenedIssues[id] !== undefined) {
      if (this.waitingOpenedIssues[id] !== currentValue) {
        delete this.waitingOpenedIssues[id];
      } else {
        return true;
      }
    }
    return false;
  }

  isWaitingComment(id: string, currentValue: any) {
    if (this.waitingComments[id] !== undefined) {
      if (this.waitingComments[id] === currentValue) {
        delete this.waitingComments[id];
      } else {
        return true;
      }
    }
    return false;
  }

  isWaitingCheck(id: string, currentValue: any) {
    if (this.waitingChecks[id] !== undefined) {
      if (this.waitingChecks[id] === currentValue) {
        delete this.waitingChecks[id];
      } else {
        return true;
      }
    }
    return false;
  }

  getScrollbarWidth() {
    const scrollDiv = document.createElement('div');
    scrollDiv.style.visibility = 'hidden';
    scrollDiv.style.overflow = 'scroll';
    scrollDiv.style.width = '100px';
    scrollDiv.style.height = '100px';

    document.body.appendChild(scrollDiv);

    const innerDiv = document.createElement('div');
    innerDiv.style.width = '100%';
    scrollDiv.appendChild(innerDiv);

    const scrollbarWidth = scrollDiv.offsetWidth - innerDiv.offsetWidth;

    document.body.removeChild(scrollDiv);

    return scrollbarWidth;
  }

  hasOverflow() {
    const element = this.elementRef?.nativeElement?.querySelector('tbody');
    if (element) {
      return element.scrollHeight > element.clientHeight;
    } else {
      return false;
    }
  }

  openDialog(data: MonitorItem) {
    const dialogRef = this.matDialog.open(CreateAlertDialogComponent, { data });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.waitingOpenedIssues[data.id] = data.open_issues;
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  toXlsx() {
    this.monitorFiltered.pipe(first()).subscribe((data) => {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Monitor Data');

      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

      const blob = new Blob([buffer], { type: 'application/octet-stream' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `monitor_data_${new Date().toISOString()}.xlsx`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
    });
  }

  navigateToSystemApi(systemId: string) {
    this.routingService.navigateToSystemApi(systemId);
  }

  commentDialog(id: string) {
    const data = { id };
    const dialogRef = this.matDialog.open(SystemCommentDialogComponent, {
      data,
      width: '1200px',
      maxWidth: '90vw',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.waitingComments[id] = result.comment;
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  removeLastCheck(id: string) {
    this.waitingChecks[id] = false;
    this.routineCheckService.removeLastCheck(id).subscribe();
  }

  checked(id: string) {
    this.waitingChecks[id] = true;
    this.routineCheckService.addCheck(id).subscribe(() => {});
  }
}
