import { AsyncPipe, CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  TrackByFunction,
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, combineLatest, first, map, Observable, shareReplay, startWith, switchMap } from 'rxjs';
import { PeopleService } from '../../endpoint/people.service';
import { SystemsService } from '../../endpoint/systems.service';
import { Store } from '@ngrx/store';
import { selectMalfunctionsItems } from '../../state/malfunctions/malfunctions.selectors';
import { System } from '../../domain/system';
import { Malfunction, MalfunctionStatus } from '../../domain/malfunction';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '../../core/lang/translate.pipe';
import { HeaderPortalRemoteComponent } from '../../core/header/header-portal-remote.component';
import { AppMetadataService } from '../../endpoint/app-metadata.service';
import { CoordinatorsService } from '../people/services/coordinators.service';
import { Sort } from '@angular/material/sort';
import { SortHeaderComponent } from '../monitoring/components/sort-header/sort-header.component';
import { setMalfunctionsStatus } from '../../state/malfunctions/malfunctions.actions';
import * as XLSX from 'xlsx';
import { CreateClientDialogComponent } from './create-client-dialog.component';

interface ClientListRow {
  id: string;
  name: string;
  clientType?: string;
  startDate?: Date;
  chargeMonths?: number[];
  price: number;
  numOfSystems: number;
  totalKWP: number;
  openMal: number;
  annualMal: number;
  contracts: string[];
  isActive: boolean;
}

interface ClientsSummary {
  clients: number;
  systems: number;
  kwp: number;
  monitoring: number;
}

interface ClientsFilters {
  clients: string[];
  clientTypes: string[];
  contracts: string[];
  showInactiveOnly: boolean;
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [
    AsyncPipe,
    CommonModule,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatTooltipModule,
    RouterModule,
    TranslatePipe,
    HeaderPortalRemoteComponent,
    SortHeaderComponent,
  ],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly peopleService = inject(PeopleService);
  private readonly systemsService = inject(SystemsService);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly appMetadata = inject(AppMetadataService);
  private readonly coordinatorsService = inject(CoordinatorsService);

  readonly monthKeys = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ];

  readonly displayedColumns = [
    'annualMal',
    'openMal',
    'totalKWP',
    'numOfSystems',
    'price',
    'chargeMonths',
    'startDate',
    'contracts',
    'clientType',
    'name',
  ];

  readonly filtersForm = this.fb.nonNullable.group({
    clients: [[] as string[]],
    clientTypes: [[] as string[]],
    contracts: [[] as string[]],
    showInactiveOnly: [false],
  });

  private readonly reloadClients$ = new BehaviorSubject<void>(void 0);
  private readonly rawClients$ = this.reloadClients$.pipe(
    switchMap(() => this.peopleService.getAllClients()),
    map(
      (clients) =>
        (clients || []).filter((client: any) => client?.isClient !== false)
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly systems$ = this.systemsService
    .getSystems()
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  private readonly systemsByClient$ = this.systems$.pipe(
    map((systems) => {
      const mapByClient = new Map<string, System[]>();
      systems.forEach((system) => {
        const clientId = system?.client?.id;
        if (!clientId) return;
        if (!mapByClient.has(clientId)) {
          mapByClient.set(clientId, []);
        }
        mapByClient.get(clientId)!.push(system);
      });
      return mapByClient;
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly systemsById$ = this.systems$.pipe(
    map((systems) => new Map(systems.map((system) => [system.id, system]))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly malfunctions$ = this.store
    .select(selectMalfunctionsItems)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  readonly clientTypesDict$ = this.appMetadata
    .clientTypes$()
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  readonly clientTypeOptions$ = this.clientTypesDict$.pipe(
    map((dict) =>
      dict
        ? Object.keys(dict).sort((a, b) => dict[a]!.localeCompare(dict[b]!))
        : []
    )
  );

  readonly clientOptions$ = this.rawClients$.pipe(
    map((clients) =>
      clients
        .map((client: any) => ({
          id: this.getClientId(client),
          name: client?.name || client?.clientName || '',
          fulltext: (client?.name || client?.clientName || '').toLowerCase(),
        }))
        .filter((option) => option.id && option.name)
        .sort((a, b) => a.name.localeCompare(b.name))
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly clientsSearchControl = new FormControl('');

  private readonly clientsControlState$ = this.filtersForm.controls.clients.valueChanges.pipe(
    startWith(this.filtersForm.controls.clients.value || [])
  );

  readonly numberOfClients$: Observable<number | string> = this.clientsControlState$.pipe(
    map((clients) => clients?.length || 'All')
  );

  readonly selectedClients$ = combineLatest([
    this.clientOptions$,
    this.clientsControlState$,
  ]).pipe(
    map(([options, selectedIds]) => {
      const selectedSet = new Set(selectedIds || []);
      return options.filter((option) => selectedSet.has(option.id));
    })
  );

  readonly filteredClients$ = combineLatest([
    this.clientOptions$,
    this.clientsSearchControl.valueChanges.pipe(startWith('')),
    this.clientsControlState$,
  ]).pipe(
    map(([options, search, selectedIds]) => {
      const selectedSet = new Set(selectedIds || []);
      let result = options.filter((option) => !selectedSet.has(option.id));

      if (search) {
        const lowerSearch = search.toLowerCase();
        result = result.filter((option) => option.fulltext.includes(lowerSearch));
      }

      return result;
    })
  );

  readonly contractOptions$ = this.systems$.pipe(
    map((systems) => {
      const contractSet = new Set<string>();
      systems.forEach((system) => {
        if (system.contract) {
          contractSet.add(system.contract);
        }
        const additional = (system as any)?.additionalContract;
        if (additional) {
          contractSet.add(additional);
        }
      });
      return ['no_contract', ...Array.from(contractSet).sort()];
    })
  );

  private readonly coordinatorClientsMap$ =
    this.coordinatorsService.allCustomersOfSelectedCoordinatorsMap;

  private readonly showAllClients$ =
    this.coordinatorsService.coordinatorsShowAll;

  private readonly rows$ = combineLatest([
    this.rawClients$,
    this.systemsByClient$,
    this.malfunctions$,
    this.systemsById$,
    this.coordinatorClientsMap$,
    this.showAllClients$,
  ]).pipe(
    map(
      ([
        clients,
        systemsByClient,
        malfunctions,
        systemsById,
        coordinatorMap,
        showAll,
      ]) => {
        const malfunctionsByClient = this.groupMalfunctionsByClient(
          malfunctions,
          systemsById
        );
        const rows: ClientListRow[] = [];
        (clients || []).forEach((client) => {
          if (!this.isClientVisible(client, coordinatorMap, showAll)) {
            return;
          }
          const id = this.getClientId(client);
          if (!id) {
            return;
          }
          const systems = systemsByClient.get(id) || [];
          const clientMalfunctions = malfunctionsByClient.get(id) || [];
          rows.push(this.buildRow(client, systems, clientMalfunctions));
        });
        return rows;
      }
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly filters$ = this.filtersForm.valueChanges.pipe(
    startWith(this.filtersForm.getRawValue()),
    map(
      (value): ClientsFilters => ({
        clients: value.clients || [],
        clientTypes: value.clientTypes || [],
        contracts: value.contracts || [],
        showInactiveOnly: Boolean(value.showInactiveOnly),
      })
    )
  );

  private readonly filteredRows$ = combineLatest([
    this.rows$,
    this.filters$,
  ]).pipe(
    map(([rows, filters]) => this.applyFilters(rows, filters)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly sortState$ = new BehaviorSubject<{
    sortField: string;
    sortDirection: number;
  }>({ sortField: 'name', sortDirection: 1 });

  readonly sortedRows$ = combineLatest([
    this.filteredRows$,
    this.sortState$,
  ]).pipe(
    map(([rows, sort]) => this.sortRows(rows, sort.sortField, sort.sortDirection))
  );

  readonly summary$ = this.filteredRows$.pipe(
    map((rows): ClientsSummary => {
      const totals = rows.reduce(
        (acc, row) => ({
          systems: acc.systems + row.numOfSystems,
          kwp: acc.kwp + row.totalKWP,
          monitoring: acc.monitoring + row.price,
        }),
        { systems: 0, kwp: 0, monitoring: 0 }
      );
      return {
        clients: rows.length,
        ...totals,
      };
    })
  );

  readonly trackTable: TrackByFunction<ClientListRow> = (_, row) => row.id;

  constructor() {
    this.store.dispatch(setMalfunctionsStatus({ status: 'open' }));
    this.store.dispatch(setMalfunctionsStatus({ status: 'closed' }));
  }

  onSort(sort: Sort) {
    if (!sort.direction) {
      this.sortState$.next({ sortField: 'name', sortDirection: 1 });
      return;
    }
    this.sortState$.next({
      sortField: sort.active,
      sortDirection: sort.direction === 'asc' ? 1 : -1,
    });
  }

  openMalfunctions(row: ClientListRow) {
    if (!row.openMal) {
      return;
    }
    this.router.navigate(['/malfunctions'], {
      queryParams: { clients: row.id },
    });
  }

  openAllMalfunctions(row: ClientListRow) {
    if (!row.annualMal) {
      return;
    }
    this.router.navigate(['/malfunctions'], {
      queryParams: { clients: row.id },
    });
  }

  exportRows() {
    this.filteredRows$.pipe(first()).subscribe((rows) => {
      if (!rows?.length) {
        return;
      }
      const worksheet = XLSX.utils.json_to_sheet(
        rows.map((row) => ({
          name: row.name,
          clientType: row.clientType,
          contracts: row.contracts.join(', '),
          startDate: row.startDate
            ? row.startDate.toISOString().split('T')[0]
            : '',
          chargeMonths: (row.chargeMonths || []).join(','),
          price: row.price,
          numOfSystems: row.numOfSystems,
          totalKWP: row.totalKWP,
          openMal: row.openMal,
          annualMal: row.annualMal,
        }))
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `clients_${new Date().toISOString()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  createClient() {
    const dialogRef = this.dialog.open(CreateClientDialogComponent, {
      width: '420px',
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.id) {
        this.reloadClients$.next();
        this.router.navigate(['/client', result.id]);
      }
    });
  }

  getContractsTooltip(contracts: string[]): string {
    return contracts.join(', ');
  }

  private buildRow(
    client: any,
    systems: System[],
    malfunctions: Partial<Malfunction>[]
  ): ClientListRow {
    const id = this.getClientId(client);
    const contractSet = new Set<string>();
    systems.forEach((system) => {
      if (system.contract) {
        contractSet.add(system.contract);
      }
      const additional = (system as any)?.additionalContract;
      if (additional) {
        contractSet.add(additional);
      }
    });

    const price = systems.reduce(
      (acc, system) =>
        acc + (Number(system.monitorPriceKw || 0) * Number(system.KWP || 0)),
      0
    );
    const totalKWP = systems.reduce(
      (acc, system) => acc + Number(system.KWP || 0),
      0
    );
    const currentYear = new Date().getFullYear();
    const openMal = malfunctions.filter(
      (mal) => mal.status === MalfunctionStatus.OPEN
    ).length;
    const annualMal = malfunctions.filter((mal) => {
      if (!mal.openTime) {
        return false;
      }
      const time = new Date(mal.openTime);
      return time.getFullYear() === currentYear;
    }).length;
    const chargeMonths = this.normalizeChargeMonths(client);

    return {
      id,
      name: client?.name || client?.clientName || '',
      clientType: client?.clientType || '',
      startDate: this.normalizeDate(client?.startDate),
      chargeMonths,
      price,
      numOfSystems: systems.length,
      totalKWP,
      openMal,
      annualMal,
      contracts: Array.from(contractSet),
      isActive: client?.isActive !== false,
    };
  }

  private normalizeChargeMonths(client: any): number[] | undefined {
    if (Array.isArray(client?.chargeMonths)) {
      return client.chargeMonths;
    }
    if (typeof client?.chargeMonth === 'number') {
      return [client.chargeMonth];
    }
    return undefined;
  }

  private normalizeDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'number') {
      return new Date(value);
    }
    if (typeof value === 'string') {
      return new Date(value);
    }
    if (value?.seconds) {
      return new Date(value.seconds * 1000);
    }
    return undefined;
  }

  private applyFilters(rows: ClientListRow[], filters: ClientsFilters) {
    return rows.filter((row) => {
      if (filters.clients.length && !filters.clients.includes(row.id)) {
        return false;
      }
      if (
        filters.clientTypes.length &&
        !filters.clientTypes.includes(row.clientType || '')
      ) {
        return false;
      }
      if (filters.contracts.length) {
        const hasContract = row.contracts.length
          ? row.contracts.some((contract) =>
              filters.contracts.includes(contract)
            )
          : filters.contracts.includes('no_contract');
        if (!hasContract) {
          return false;
        }
      }
      if (filters.showInactiveOnly) {
        return row.isActive === false;
      }
      return row.isActive !== false;
    });
  }

  private sortRows(rows: ClientListRow[], field: string, direction: number) {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const dir = direction;
      switch (field) {
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'clientType':
          return (a.clientType || '').localeCompare(b.clientType || '') * dir;
        case 'price':
          return (a.price - b.price) * dir;
        case 'numOfSystems':
          return (a.numOfSystems - b.numOfSystems) * dir;
        case 'totalKWP':
          return (a.totalKWP - b.totalKWP) * dir;
        case 'openMal':
          return (a.openMal - b.openMal) * dir;
        case 'annualMal':
          return (a.annualMal - b.annualMal) * dir;
        case 'startDate':
          return (
            ((a.startDate?.getTime() || 0) -
              (b.startDate?.getTime() || 0)) * dir
          );
        default:
          return a.name.localeCompare(b.name) * dir;
      }
    });
    return sorted;
  }

  private groupMalfunctionsByClient(
    malfunctions: Partial<Malfunction>[],
    systemsMap: Map<string, System>
  ) {
    const grouped = new Map<string, Partial<Malfunction>[]>();
    (malfunctions || []).forEach((mal) => {
      const system = mal.systemId ? systemsMap.get(mal.systemId) : undefined;
      const clientId = system?.client?.id;
      if (!clientId) {
        return;
      }
      if (!grouped.has(clientId)) {
        grouped.set(clientId, []);
      }
      grouped.get(clientId)!.push(mal);
    });
    return grouped;
  }

  private isClientVisible(
    client: any,
    coordinatorMap: Map<string, any>,
    showAll: boolean
  ) {
    if (showAll) {
      return true;
    }
    const id = this.getClientId(client);
    return coordinatorMap instanceof Map ? coordinatorMap.has(id) : false;
  }

  private getClientId(client: any) {
    return client?._id || client?.id || '';
  }
}


