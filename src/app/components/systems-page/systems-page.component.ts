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
import { DirectMonitorService } from '../../services/direct-monitor.service';
import { IssuesCountPipe } from '../../pipes/issues-count.pipe';
import { map, shareReplay, combineLatest, first, debounceTime } from 'rxjs';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LANGUAGE } from '../../../lang';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CreateAlertDialogComponent } from '../create-alert-dialog/create-alert-dialog.component';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MonitorItem } from '../../domain/monitor-item';
import { Store } from '@ngrx/store';
import { selectMonitorItems } from '../../state/monitor/monitor.selectors';
import * as XLSX from 'xlsx';

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
      MatDialogModule,
      FiltersComponent,
      HeaderComponent,
      IssuesCountPipe,
    ],
    TranslatePipe,
    MatProgressSpinner,
  ],
  templateUrl: './systems-page.component.html',
  styleUrl: './systems-page.component.css',
  providers: [FiltersControlService, DataService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemsPageComponent {
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

  dataSource = new MatTableDataSource<any>();

  directMonitorService = inject(DirectMonitorService);

  monitorFiltered = combineLatest([
    this.filtersControls.kwpControlState,
    this.filtersControls.portalControlState,
    this.filtersControls.activityControlState,
    this.filtersControls.systemsControlStateMap,
    this.filtersControls.clientsControlStateMap,
    this.filtersControls.regionsControlStateMap,
    this.filtersControls.contractsControlState,
    this.store.select(selectMonitorItems).pipe(debounceTime(500)),
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
          const accpets: Array<(item: MonitorItem) => boolean> = [];
          if (activity.includes('status_active_with_issues')) {
            accpets.push((item) => item.system_active && item.open_issues > 0);
          }
          if (activity.includes('status_active_without_issues')) {
            accpets.push(
              (item) => item.system_active && item.open_issues === 0
            );
          }
          if (activity.includes('status_inactive')) {
            accpets.push((item) => !item.system_active);
          }
          filters.push((item) => accpets.some((filter) => filter(item)));
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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef,
    private elementRef: ElementRef,
    private matDialog: MatDialog,
    private changeDetectorRef: ChangeDetectorRef
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
}
