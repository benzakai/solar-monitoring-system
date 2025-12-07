import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  AfterViewInit,
  ViewChild,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  combineLatest,
  map,
  of,
  shareReplay,
  switchMap,
  take,
  startWith,
} from 'rxjs';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CoordinatorsService } from '../people/services/coordinators.service';

import { PeopleService } from '../../endpoint/people.service';
import { SystemsService } from '../../endpoint/systems.service';
import { Person } from '../../domain/person';
import { System } from '../../domain/system';
import { TranslatePipe } from '../../core/lang/translate.pipe';
import { ClientSystemsChartComponent } from './client-systems-chart.component';
import { PersonInfoDialogComponent } from '../system-settings/components/person-info-dialog/person-info-dialog.component';
import { ClientContactsTableComponent } from './contacts-table/client-contacts-table.component';
import { ClientSendingListComponent } from './sending-list/client-sending-list.component';
import { EnergyService } from '../../endpoint/energy.service';
import { MonitorFacade } from '../../state/monitor/monitor.facade';
import { RecentClientReportsComponent } from './recent-client-reports.component';
import { ClientType } from '../../domain/client-type';
import { AppMetadataService } from '../../endpoint/app-metadata.service';
import { ChargePeriod } from '../../domain/charge-period';
import { MonitorItem } from '../../domain/monitor-item';

@Component({
  selector: 'app-client-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    RouterModule,
    TranslatePipe,
    ClientSystemsChartComponent,
    ClientContactsTableComponent,
    ClientSendingListComponent,
    RecentClientReportsComponent,
  ],
  templateUrl: './client-details.component.html',
  styleUrls: ['./client-details.component.scss'],
})
export class ClientDetailsComponent implements OnInit, AfterViewInit {
  private destroyRef = inject(DestroyRef);
  private activatedRoute = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);
  private people = inject(PeopleService);
  private systems = inject(SystemsService);
  private energy = inject(EnergyService);
  private dialog = inject(MatDialog);
  private coordinatorsService = inject(CoordinatorsService);
  private monitorFacade = inject(MonitorFacade);
  private appMetadata = inject(AppMetadataService);

  translate = new TranslatePipe();

  clientTypesDict$ = this.appMetadata.clientTypes$();
  clientTypes$ = this.clientTypesDict$.pipe(
    map((obj) =>
      obj ? Object.keys(obj).sort((a, b) => obj[a]!.localeCompare(obj[b]!)) : []
    )
  );

  chargePeriods = [ChargePeriod.YEAR, ChargePeriod.HALF, ChargePeriod.QUARTER];
  dataSource = new MatTableDataSource<any>([]);
  @ViewChild(MatSort) sort!: MatSort;

  loading$ = new BehaviorSubject<boolean>(true);
  saving$ = new BehaviorSubject<boolean>(false);

  form!: FormGroup;

  coordinators$ = this.coordinatorsService.coordinators;

  monitorItems$ = this.monitorFacade.monitorItems;

  client$ = this.activatedRoute.params.pipe(
    takeUntilDestroyed(this.destroyRef),
    map((p) => p['id']),
    switchMap((id) => (id ? this.people.getById(id) : of(null))),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  clientMonitorItems$ = combineLatest([this.monitorItems$, this.client$]).pipe(
    map(([items, client]) => {
      const clientId = (client as any)?._id || (client as any)?.id;
      return (items || []).filter((i) => i?.client?.id === clientId);
    }),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  // enrichedClientSystems$ defined after clientSystems$

  clientSystems$ = this.activatedRoute.params.pipe(
    map((p) => p['id'] as string),
    switchMap((clientId) =>
      clientId
        ? this.systems
            .getSystems()
            .pipe(
              map((systems) => systems.filter((s) => s.client?.id === clientId))
            )
        : of([] as System[])
    ),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  enrichedClientSystems$ = combineLatest([
    this.clientMonitorItems$,
    this.clientSystems$.pipe(startWith([] as System[])),
  ]).pipe(
    map(([items, systems]) => {
      const systemById = new Map<string, System>(
        (systems || []).map((s: System) => [s.id, s])
      );
      const misById = new Map<string, MonitorItem>(
        (items || []).map((s: MonitorItem) => [s.id, s])
      );
      return (systems || []).map((x: any) => {
        const sys = systemById.get(x.id);
        const mi = systemById.get(x.id);
        const monitorPriceKw = sys?.monitorPriceKw;
        const taoz = sys?.taoz ?? null;
        const regulation = sys?.regulation;
        const priceTotal =
          typeof monitorPriceKw === 'number'
            ? (monitorPriceKw || 0) * (x.kwp || 0)
            : undefined;
        return {
          ...mi,
          sys,
          _monitorPriceKw: monitorPriceKw,
          _priceTotal: priceTotal,
          _taoz: taoz,
          _regulation: regulation,
        } as any;
      });
    }),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

  totalPrice$ = this.clientSystems$.pipe(
    map((systems) =>
      systems
        .map((s) => Number(s.monitorPriceKw || 0) * Number(s.KWP || 0))
        .reduce((p, c) => p + c, 0)
    )
  );

  months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: new Date(2024, i, 1),
  }));
  today = new Date();
  chartPeriodStart: Date = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );
  chartPeriodEnd: Date = new Date();
  minDate?: Date;
  chartStartCtrl = new FormControl<Date | null>(null);
  chartEndCtrl = new FormControl<Date | null>(null);
  private clientId: string | null = null;

  ngOnInit(): void {
    this.client$.pipe(take(1)).subscribe((client) => {
      this.buildForm(client);
      this.loading$.next(false);
      this.clientId = (client as any)?.id || (client as any)?._id || null;
      this.chartStartCtrl.setValue(this.chartPeriodStart, { emitEvent: false });
      this.chartEndCtrl.setValue(this.chartPeriodEnd, { emitEvent: false });
    });

    // Compute minDate from client startDate or earliest energy
    combineLatest([this.client$, this.clientSystems$.pipe(take(1))])
      .pipe(take(1))
      .subscribe(async ([client, systems]) => {
        const clientStart = (client as any)?.startDate
          ? this.startOfDay(new Date((client as any).startDate))
          : undefined;
        let earliestEnergy: Date | undefined;
        try {
          const energies = await Promise.all(
            systems.map((s) =>
              this.energy.getEnergy(s.id).pipe(take(1)).toPromise()
            )
          );
          const minTs = Math.min(
            ...energies
              .map((e) =>
                e?.daily?.length
                  ? Math.min(...e.daily.map((d) => d.time))
                  : Infinity
              )
              .filter((v) => isFinite(v))
          );
          earliestEnergy = isFinite(minTs)
            ? this.startOfDay(new Date(minTs))
            : undefined;
        } catch {}
        this.minDate = clientStart || earliestEnergy;
        this.setDefaultRange();
        this.chartStartCtrl.setValue(this.chartPeriodStart, {
          emitEvent: true,
        });
        this.chartEndCtrl.setValue(this.chartPeriodEnd, { emitEvent: true });
      });
    // bind systems data to table dataSource
    this.enrichedClientSystems$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rows) => {
        this.dataSource.data = rows || [];
      });

    // configure sorting accessor for displayed columns
    this.dataSource.sortingDataAccessor = (item: any, property: string) => {
      switch (property) {
        case 'name':
          return item.system_name || '';
        case 'portal':
          return item.portal || '';
        case 'kwp':
          return Number(item.kwp || 0);
        case 'active':
          return item.system_active ? 1 : 0;
        case 'issuesYear':
          return Number(item.open_issues || 0);
        case 'tariff':
          return item._taoz
            ? item._taoz === 'high'
              ? 2
              : 1
            : Number(item._regulation ?? 0);
        case 'pricePerKw':
          return Number(item._monitorPriceKw ?? 0);
        case 'priceTotal':
          return Number(item._priceTotal ?? 0);
        default:
          return (item as any)[property];
      }
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  private buildForm(client: Person | null) {
    const rawStartDate = (client as any)?.startDate;
    // Convert Firestore Timestamp to Date if needed
    const startDate = rawStartDate?.toDate?.() ?? (rawStartDate ? new Date(rawStartDate) : null);

    this.form = this.formBuilder.group({
      name: [client?.name, Validators.required],
      email: [client?.email, [Validators.email]],
      phone: [client?.phone],
      isActive: [client?.isActive ?? true],
      isDailyReport: [(client as any)?.isDailyReport ?? false],
      startDate: [startDate],
      clientType: [(client as any)?.clientType ?? null],
      chargePeriod: [(client as any)?.chargePeriod ?? null],
      chargeMonth: [(client as any)?.chargeMonth ?? null],
      coordinatorUid: [client?.coordinatorUid ?? null],
    });
  }

  async save(clientId: string) {
    if (this.form.invalid) return;
    this.saving$.next(true);
    try {
      const formValue = { ...this.form.value };
      // Convert startDate to ISO string format
      if (formValue.startDate instanceof Date) {
        formValue.startDate = formValue.startDate.toISOString();
      }
      await this.people
        .updatePerson(clientId, formValue)
        .pipe(take(1))
        .toPromise();
      this.form.markAsPristine();
    } finally {
      this.saving$.next(false);
    }
  }

  async saveCoordinator(clientId: string) {
    const uid = this.form.get('coordinatorUid')?.value;
    if (!clientId) return;
    this.saving$.next(true);
    try {
      await this.people
        .updatePerson(clientId, { coordinatorUid: uid })
        .pipe(take(1))
        .toPromise();
      this.form.get('coordinatorUid')?.markAsPristine();
    } finally {
      this.saving$.next(false);
    }
  }

  onRangeClosed() {
    const startVal = this.chartStartCtrl.value as Date | null;
    const endVal = this.chartEndCtrl.value as Date | null;

    if (!startVal || !endVal) {
      this.setDefaultRange();
      this.chartStartCtrl.setValue(this.chartPeriodStart, { emitEvent: true });
      this.chartEndCtrl.setValue(this.chartPeriodEnd, { emitEvent: true });
      return;
    }

    let normalizedStart = this.startOfDay(startVal);
    let normalizedEnd = this.endOfDay(endVal);

    if (normalizedEnd.getTime() > this.today.getTime()) {
      normalizedEnd = this.endOfDay(this.today);
    }
    if (this.minDate && normalizedStart.getTime() < this.minDate.getTime()) {
      normalizedStart = this.startOfDay(this.minDate);
    }
    if (normalizedEnd.getTime() < normalizedStart.getTime()) {
      const proposedStart = new Date(
        normalizedEnd.getTime() - 31 * 24 * 60 * 60 * 1000
      );
      normalizedStart =
        this.minDate && proposedStart < this.minDate
          ? this.startOfDay(this.minDate)
          : this.startOfDay(proposedStart);
    }

    this.chartPeriodStart = normalizedStart;
    this.chartPeriodEnd = normalizedEnd;
    this.chartStartCtrl.setValue(normalizedStart, { emitEvent: true });
    this.chartEndCtrl.setValue(normalizedEnd, { emitEvent: true });
  }

  private setDefaultRange() {
    const yesterday = new Date(
      this.today.getFullYear(),
      this.today.getMonth(),
      this.today.getDate() - 1
    );
    const end = this.endOfDay(yesterday);
    const startCandidate = new Date(end.getTime() - 31 * 24 * 60 * 60 * 1000);
    const start =
      this.minDate && startCandidate < this.minDate
        ? this.startOfDay(this.minDate)
        : this.startOfDay(startCandidate);
    this.chartPeriodStart = start;
    this.chartPeriodEnd = end;
  }

  startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  endOfDay(d: Date): Date {
    return new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23,
      59,
      59,
      999
    );
  }

  openClientInfo() {
    if (!this.clientId) return;
    this.dialog.open(PersonInfoDialogComponent, {
      width: '500px',
      data: { personId: this.clientId },
    });
  }

  sanitizePhone(v?: string | null): string {
    return (v || '').toString().replace(/\s|-/g, '');
  }
}
