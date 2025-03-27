import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HeaderComponent } from '../../../core/header/header.component';
import { TranslatePipe } from '../../../core/lang/translate.pipe';
import { Store } from '@ngrx/store';
import {
  selectIsClosedLoading,
  selectMalfunctionsItems,
} from '../../../state/malfunctions/malfunctions.selectors';
import {
  BehaviorSubject,
  debounceTime,
  map,
  shareReplay,
  switchMap,
  combineLatest,
  Observable,
  filter,
  take,
  startWith,
  first,
} from 'rxjs';
import { AsyncPipe, DatePipe, DecimalPipe, JsonPipe } from '@angular/common';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatCell, MatTableModule } from '@angular/material/table';
import { SeverityIconComponent } from '../severity-icon/severity-icon.component';
import { MatChipsModule } from '@angular/material/chips';
import { Malfunction, MalfunctionStatus } from '../../../domain/malfunction';
import {
  loadAllMalfunctions,
  setMalfunctionsStatus,
} from '../../../state/malfunctions/malfunctions.actions';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MonitorFacade } from '../../../state/monitor/monitor.facade';
import { MonitorItem } from '../../../domain/monitor-item';
import { Sort } from '@angular/material/sort';
import { SortHeaderComponent } from '../../monitoring/components/sort-header/sort-header.component';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { LogsTableComponent } from '../logs-table/logs-table.component';
import { RoutingService } from '../../../core/routing/routing.service';
import {
  MatDatepickerToggle,
  MatDateRangeInput,
  MatDateRangePicker,
  MatEndDate,
  MatStartDate,
} from '@angular/material/datepicker';
import {
  MatError,
  MatFormField,
  MatPrefix,
} from '@angular/material/form-field';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatNativeDateModule } from '@angular/material/core';
import { FiltersControlService } from '../../monitoring/services/filters-control.service';
import { MalfunctionsFiltersComponent } from '../malfunctions-filters/malfunctions-filters.component';
import { MatDialog } from '@angular/material/dialog';
import { MalfunctionPeopleComponent } from '../malfunction-people/malfunction-people.component';
import { DateUtil } from '../../../core/date/DateUtil';
import { CreateAlertDialogComponent } from '../../monitoring/components/create-alert-dialog/create-alert-dialog.component';
import { System } from '../../../domain/system';
import { SelectSystemDialogComponent } from '../select-system-dialog/select-system-dialog.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-malfunctions',
  standalone: true,
  imports: [
    HeaderComponent,
    TranslatePipe,
    AsyncPipe,
    DecimalPipe,
    MatButton,
    MatCell,
    MatTableModule,
    MatButtonModule,
    SeverityIconComponent,
    DatePipe,
    MatChipsModule,
    ScrollingModule,
    MatProgressSpinner,
    SortHeaderComponent,
    MatIcon,
    LogsTableComponent,
    RouterModule,
    JsonPipe,
    MatDateRangeInput,
    MatDateRangePicker,
    MatDatepickerToggle,
    MatEndDate,
    MatError,
    MatFormField,
    MatPrefix,
    MatStartDate,
    ReactiveFormsModule,
    MatNativeDateModule,
    MalfunctionsFiltersComponent,
  ],
  providers: [FiltersControlService],
  templateUrl: './malfunctions.component.html',
  styleUrl: './malfunctions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MalfunctionsComponent {
  routingService = inject(RoutingService);
  store = inject(Store);
  router = inject(Router);
  dialogService = inject(MatDialog);
  displayedColumns: string[] = [
    'actions',
    'edit',
    'contact',
    'tracingDate',
    'difference',
    'daysOfMalfunction',
    'severity',
    'reportStatus',
    'malfunctionType',
    //'roofType',
    'portal',
    'systemName',
  ];

  readonly range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  severities = new BehaviorSubject({
    1: true,
    2: true,
    3: true,
  });

  expanded: { [s in string]?: boolean } = {};

  closedLoading = this.store.select(selectIsClosedLoading);

  statuses = new BehaviorSubject({
    open: true,
    closed: false,
  });
  //filtersControls = inject(FiltersControlService);
  openSelected = this.statuses.pipe(map((statuses) => statuses.open));
  closedSelected = this.statuses.pipe(map((statuses) => statuses.closed));

  malfunctions = this.store.select(selectMalfunctionsItems).pipe(
    debounceTime(200),
    map((items) =>
      items.map((item) => ({
        ...item,
        alertClass: this.alertClass(item.tracingTime),
      }))
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  rangeChanges = this.range.valueChanges.pipe(startWith(this.range.value));

  filteredMalfunctions = this.statuses.pipe(
    switchMap((statuses) =>
      this.malfunctions.pipe(
        map((items) =>
          items.filter((item) =>
            statuses.open && statuses.closed
              ? true
              : statuses.open
                ? item.status === MalfunctionStatus.OPEN
                : item.status === MalfunctionStatus.CLOSED
          )
        )
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  compare(a: any, b: any, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  activeSort = new BehaviorSubject({
    sortField: 'tracingDate',
    sortDirection: 'asc',
  });

  sortParams = this.activeSort.pipe(
    map(({ sortField, sortDirection }) => ({
      sortField,
      sortDirection: sortDirection === 'asc' ? 1 : -1,
    }))
  );

  monitorFacade = inject(MonitorFacade);
  mergedMalfunctions: Observable<
    Array<Partial<Malfunction> & { system: Partial<MonitorItem> }>
  > = combineLatest([
    this.monitorFacade.monitorItems.pipe(
      filter((items): items is MonitorItem[] => Boolean(items?.length > 0)),
      take(1),
      map((items) => new Map(items.map((item) => [item.id, item])))
    ),
    this.filteredMalfunctions,
  ]).pipe(
    debounceTime(500),
    map(([systems, malfunctions]) => {
      return malfunctions.map((malfunction) => ({
        ...malfunction,
        system: malfunction.systemId
          ? (systems.get(malfunction.systemId) as MonitorItem) || {}
          : {},
      }));
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  filtersControls = inject(FiltersControlService);
  doubleFilteredMergedMalfunctions = combineLatest([
    this.mergedMalfunctions,
    this.rangeChanges,
    this.filtersControls.portalControlState,
    this.filtersControls.systemsControlStateMap,
    this.filtersControls.clientsControlStateMap,
    this.filtersControls.regionsControlStateMap,
  ]).pipe(
    map(([items, timeRange, portals, systems, clients, regions]) => {
      const filters: Array<(item: (typeof items)[0]) => boolean> = [];

      if (timeRange.start && timeRange.end) {
        const startT = timeRange.start.getTime();
        const endDate = new Date(timeRange.end.getTime());
        endDate.setHours(23, 59, 59, 999);
        const endT = endDate.getTime();
        filters.push((item: Partial<Malfunction>) => {
          return Boolean(
            item.tracingTime &&
              new Date(item.tracingTime).getTime() >= startT &&
              new Date(item.tracingTime).getTime() <= endT
          );
        });
      }

      if (portals?.length) {
        filters.push(
          (item) => item.system.portal && portals.includes(item.system.portal)
        );
      }

      if (Object.keys(systems).length) {
        filters.push((item) => Boolean(item.id && systems[item.id]));
      }

      if (Object.keys(clients).length) {
        filters.push((item) =>
          Boolean(item.system.client?.id && clients[item.system.client.id])
        );
      }

      if (Object.keys(regions).length) {
        filters.push((item) =>
          (item.system.region || []).some((ireg: string) => regions[ireg])
        );
      }

      return items.filter((item) => filters.every((filter) => filter(item)));
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  sortedMalfunctions = combineLatest([
    this.doubleFilteredMergedMalfunctions,
    this.sortParams,
  ]).pipe(
    map(([malfunctions, sorts]) =>
      [...malfunctions].sort((a, b) => {
        const isAsc = sorts.sortDirection === 1;
        switch (sorts.sortField) {
          case 'tracingDate':
            return this.compare(
              new Date(a.tracingTime as string).getTime(),
              new Date(b.tracingTime as string).getTime(),
              isAsc
            );
          case 'difference':
            return this.compare(
              a?.system?.yesterday_percent,
              b?.system?.yesterday_percent,
              isAsc
            );
          case 'daysOfMalfunction':
            return this.compare(a?.days, b?.days, isAsc);
          case 'severity':
            return this.compare(a.severity, b.severity, isAsc);
          case 'malfunctionType':
            return this.compare(
              a.type ? a.type[0] : '',
              b.type ? b.type[0] : '',
              isAsc
            );
          case 'portal':
            return this.compare(a?.system?.portal, b?.system?.portal, isAsc);
          case 'systemName':
            return this.compare(
              a?.system?.system_name,
              b?.system?.system_name,
              isAsc
            );
          case 'status':
            return this.compare(a.status, b.status, isAsc);
          case 'hardware':
            return this.compare(a.severity, b.severity, isAsc);
          default:
            return 0;
        }
      })
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  toggledMalfunctions = combineLatest([
    this.sortedMalfunctions,
    this.severities.pipe(
      map((severities) =>
        Object.keys(severities)
          .filter((k) => severities[k as '1' | '2' | '3'])
          .map(Number)
      )
    ),
  ]).pipe(
    map(([malfunctions, severities]) =>
      malfunctions.filter((malfunction) =>
        severities.includes(malfunction?.severity || 0)
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  counts = this.sortedMalfunctions.pipe(
    map((malfunctions) => {
      const all = malfunctions.length;
      let low = 0;
      let medium = 0;
      let high = 0;

      malfunctions.forEach((malfunction) => {
        if (malfunction.severity === 1) {
          low++;
        }
        if (malfunction.severity === 2) {
          medium++;
        }
        if (malfunction.severity === 3) {
          high++;
        }
      });

      return { all, low, medium, high };
    })
  );

  constructor() {
    this.store.dispatch(setMalfunctionsStatus({ status: 'open' }));
  }

  trackTable(i: number, item: Partial<Malfunction>) {
    return item?.id;
  }

  toggleStatus(status: 'open' | 'closed') {
    this.store.dispatch(setMalfunctionsStatus({ status }));
    const current = this.statuses.value;
    this.statuses.next({ ...current, [status]: Boolean(!current[status]) });
  }

  toggleSeverity(severity: 1 | 2 | 3) {
    const current = this.severities.value;
    this.severities.next({
      ...current,
      [severity]: Boolean(!current[severity]),
    });
  }

  resetSeverity() {
    this.severities.next({
      1: true,
      2: true,
      3: true,
    });
  }

  onSort(sortState: Sort) {
    this.activeSort.next({
      sortDirection: sortState.direction,
      sortField: sortState.active,
    });
  }

  gotoMalfunction(id: string) {
    this.router.navigate(['/malfunction-edit', id]);
  }

  toggleRow(id: string) {
    this.expanded[id] = !this.expanded[id];
  }

  navigateToSystemApi(systemId: string) {
    this.routingService.navigateToSystemApi(systemId);
  }

  peopleDialog(id: string) {
    this.dialogService.open(MalfunctionPeopleComponent, {
      data: {
        id,
      },
    });
  }

  alertClass(date: any) {
    const daysPassed = DateUtil.DaysFromToday(date);
    if (daysPassed > 0) {
      return 'alert-3';
    } else if (daysPassed === 0) {
      return 'alert-2';
    } else {
      return '';
    }
  }

  selectSystemAndCreateMalfunction() {
    const ref = this.dialogService.open(SelectSystemDialogComponent);
    ref.afterClosed().subscribe((system?: MonitorItem) => {
      if (system) {
        this.createMalfunction(system);
      }
    });
  }

  createMalfunction(system: MonitorItem) {
    const dialogRef = this.dialogService.open(CreateAlertDialogComponent, {
      data: {
        id: system?.id || '',
        system_name: system?.system_name || '',
      },
    });
  }

  toXlsx() {
    this.toggledMalfunctions.pipe(first()).subscribe((data) => {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Malfunctions');

      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

      const blob = new Blob([buffer], { type: 'application/octet-stream' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `malfunctions_${new Date().toISOString()}.xlsx`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
    });
  }
}
