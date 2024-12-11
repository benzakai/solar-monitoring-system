import {
  ChangeDetectionStrategy,
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
import {
  DirectMonitorService,
  MonitorItem,
} from '../../services/direct-monitor.service';
import { IssuesCountPipe } from '../../pipes/issues-count.pipe';
import { map, shareReplay, combineLatest } from 'rxjs';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LANGUAGE } from '../../../lang';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CreateAlertDialogComponent } from '../create-alert-dialog/create-alert-dialog.component';

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
    this.directMonitorService.monitor,
  ]).pipe(
    map(([kwp, portals, activity, systems, clients, regions, data]) => {
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
        filters.push((item) =>
          Boolean(item.client?.id && clients[item.client.id])
        );
      }

      if (Object.keys(regions).length) {
        filters.push((item) =>
          (item.region || []).some((ireg: string) => regions[ireg])
        );
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

  scrollSize = this.getScrollbarWidth();

  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef,
    private elementRef: ElementRef,
    private matDialog: MatDialog
  ) {
    this.monitorFiltered
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.dataSource.data = data;
      });

    this.openDialog({
      id: '01rINLX6TWaOgZcuXnIb',
      three_days_percent: 84.31904139418859,
      open_issues: 0,
      monthly_percent: 97.23471143540011,
      client: {
        name: 'מועצה אזורית זבולון ',
        id: 'UoDNc30FpUoDiokhRPex',
      },
      system_active: true,
      kwp: 46.41,
      last_month_average: 2.605528262587087,
      yesterday_comparable: 3.164642262390403,
      yesterday_percent: 83.91170498459006,
      today_comparable: 1.9058563220496958,
      weekly_percent: 83.41287322576808,
      today_average: 2.046369316957552,
      close_issues: 12,
      portal: 'SE',
      today_percent: 107.37269610947054,
      weekly_comparable: 22.06207085915352,
      yesterday_average: 2.655505279034691,
      three_days_average: 8.330683042447749,
      weeky_average: 18.402607196724848,
      comments: 'תקשורת מעוכבת להסתכל יום אחרי',
      since_month_percent: 41.888615959204195,
      monthly_comparable: 80.38883102928084,
      since_month_sum: 31.416461969403148,
      three_days_comparable: 9.87995463978545,
      region: ['GALIL_VALLEYS'],
      system_name: 'Zvulun - Carmel B',
    } as any);
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
      console.log(`Dialog result: ${result}`);
    });
  }
}
