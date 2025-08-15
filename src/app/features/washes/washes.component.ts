import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import { MatDialog } from '@angular/material/dialog';
import { AddWashDialogComponent } from './components/add-wash-dialog/add-wash-dialog.component';
import { EditWashDialogComponent } from './components/edit-wash-dialog/edit-wash-dialog.component';
import { CommentWashDialogComponent } from './components/comment-wash-dialog/comment-wash-dialog.component';
import { WashesListDialogComponent } from './components/washes-list-dialog/washes-list-dialog.component';
import { WashesFiltersComponent } from './components/washes-filters/washes-filters.component';
import { FiltersControlService } from '../monitoring/services/filters-control.service';
import { MonitorItem } from '../../domain/monitor-item';
import { RoutingService } from '../../core/routing/routing.service';

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
    AddWashDialogComponent,
    EditWashDialogComponent,
    CommentWashDialogComponent,
    WashesListDialogComponent,
    WashesFiltersComponent,
  ],
  templateUrl: './washes.component.html',
  providers: [FiltersControlService],
  styleUrl: './washes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WashesComponent implements OnInit {
  washesService = inject(WashesService);
  monitorFacade = inject(MonitorFacade);
  systemsWashService = inject(SystemsWashService);
  energyService = inject(EnergyService);
  dialog = inject(MatDialog);
  filtersControls = inject(FiltersControlService);
  cdf = inject(ChangeDetectorRef);
  destroyRef = inject(DestroyRef);
  routingService = inject(RoutingService);
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
    'portal',
    'washRate',

    'KWP',
    'washType',
    'name',
    'clientName',
  ];

  @ViewChild(MatSort) sort: MatSort | null = null;

  startOfYear = Date.UTC(new Date().getFullYear());

  washesRows = combineLatest([
    this.monitorFacade.monitorItems,
    this.washesService
      .getWashes()
      .pipe(
        map((washes) =>
          washes.map((w) => ({
            ...w,
            washes: w.washes.filter(({ date }) => date > this.startOfYear),
          }))
        )
      ),
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

  washesFiltered = combineLatest([
    this.filtersControls.systemsControlStateMap,
    this.filtersControls.clientsControlStateMap,
    this.filtersControls.contractsControlState,
    this.washesRows,
  ]).pipe(
    map(([systems, clients, contracts, data]) => {
      const filters: Array<(item: WashRow) => boolean> = [];

      if (Object.keys(systems).length) {
        filters.push((item) => systems[item.system.id]);
      }

      if (Object.keys(clients).length) {
        filters.push((item) =>
          Boolean(item.system.client?.id && clients[item.system.client.id])
        );
      }

      const contractsMap: { [key: string]: boolean } = (contracts || []).reduce(
        (acc, item) =>
          Object.assign(acc, { [item === 'no_contract' ? '' : item]: true }),
        {}
      );

      if (contracts?.length) {
        filters.push((item) => contractsMap[item.system.contract]);
      }

      return data.filter((item) => filters.every((filter) => filter(item)));
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  navigateToSystemApi(systemId: string) {
    this.routingService.navigateToSystemApi(systemId);
  }

  sortedRows = combineLatest([this.washesFiltered, this.sortParams]).pipe(
    map(([rows, sorts]) =>
      [...rows].sort((a, b) => {
        const isAsc = sorts.sortDirection === 1;
        switch (sorts.sortField) {
          case 'clientName':
            return this.compare(a.clientName, b.clientName, isAsc);
          case 'name':
            return this.compare(a.name, b.name, isAsc);
          case 'washType':
            return this.compare(
              a.system.washType || 0,
              b.system.washType || 0,
              isAsc
            );
          case 'KWP':
            return this.compare(a.system.kwp, b.system.kwp, isAsc);
          case 'potential':
            return this.compare(a.potential, b.potential, isAsc);
          case 'week1':
            return this.compare(
              a.system.past1Week || 0,
              b.system.past1Week || 0,
              isAsc
            );
          case 'week2':
            return this.compare(
              a.system.past2Week || 0,
              b.system.past2Week || 0,
              isAsc
            );
          case 'week3':
            return this.compare(
              a.system.past3Week || 0,
              b.system.past3Week || 0,
              isAsc
            );
          case 'washRate':
            return this.compare(a.washRate, b.washRate, isAsc);
          case 'sinceLastWash':
            return this.compare(a.sinceLastWash, b.sinceLastWash, isAsc);
          case 'lastWashDate':
            return this.compare(
              a.lastWashDate || 0,
              b.lastWashDate || 0,
              isAsc
            );
          case 'nextWash':
            return this.compare(a.nextWash || 0, b.nextWash || 0, isAsc);
          case 'supplier':
            return this.compare(a.supplier, b.supplier, isAsc);
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
    this.sortedRows.subscribe((rows) => {
      this.dataSource.data = rows;
      this.cdf.markForCheck();
    });
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

  addWash(washRow: WashRow) {
    this.dialog.open(AddWashDialogComponent, {
      data: {
        washRow,
      },

      width: '800px',
      maxWidth: '90vw',
    });
  }

  editWash(washRow: WashRow) {
    this.dialog.open(EditWashDialogComponent, {
      data: {
        washRow,
      },

      width: '800px',
      maxWidth: '90vw',
    });
  }

  editComment(washRow: WashRow) {
    this.dialog.open(CommentWashDialogComponent, {
      data: {
        washRow,
      },
      width: '800px',
      panelClass: 'ytong',
      maxWidth: '90vw',
    });
  }

  openWashesList(washRow: WashRow) {
    this.dialog.open(WashesListDialogComponent, {
      data: { washRow },
      width: '800px',
      maxWidth: '90vw',
    });
  }

  toggleWashDone(washRow: WashRow, washDone: boolean) {
    this.washesService.updateWashDone(washRow.system.id, washDone).subscribe();
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
