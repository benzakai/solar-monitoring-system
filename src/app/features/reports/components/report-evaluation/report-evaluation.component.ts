import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe, JsonPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  forkJoin,
  map,
  merge,
  of,
  skip,
  switchMap,
  take,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';

import { MonitorFacade } from '../../../../state/monitor/monitor.facade';
import { SystemsService } from '../../../../endpoint/systems.service';
import { EnergyService } from '../../../../endpoint/energy.service';
import { MalfunctionsService } from '../../../../endpoint/malfunctions.service';
import { AppEndpointService } from '../../../../endpoint/app-endpoint.service';
import { WashesService } from '../../../../endpoint/washes.service';
import { DateUtil } from '../../../../core/date/DateUtil';
import { EnergyCalc } from '../../../../core/energy/energy-calculator';
import { System } from '../../../../domain/system';
import { Energy } from '../../../../domain/energy';

import {
  alignDateToReport,
  createReport,
} from '../reports-table/createReport';
import {
  createSystemReportData,
  SystemReportDoc,
} from '../report-preview/pre';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { HeaderPortalRemoteComponent } from '../../../../core/header/header-portal-remote.component';
import { MatDialog } from '@angular/material/dialog';
import {
  EnvDetailDialogComponent,
  EnvDetailSample,
} from './env-detail-dialog.component';

type See = {
  system: System;
  energy: Energy;
};

export interface EvaluationResult {
  systemId: string;
  systemName: string;
  clientName: string;
  mainSystemKwp: number;
  raw: any;
  processed: ReturnType<typeof createSystemReportData>;
  environmentPerMonth: number[];
  /** Raw per-system samples grouped by month (0-11) */
  environmentRawByMonth: EnvDetailSample[][];
}

@Component({
  selector: 'app-report-evaluation',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    DecimalPipe,
    JsonPipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatChipsModule,
    MatDividerModule,
    TranslatePipe,
    HeaderPortalRemoteComponent,
  ],
  templateUrl: './report-evaluation.component.html',
  styleUrl: './report-evaluation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportEvaluationComponent implements OnInit {
  private monitorFacade = inject(MonitorFacade);
  private systemsService = inject(SystemsService);
  private energyService = inject(EnergyService);
  private malfunctionsService = inject(MalfunctionsService);
  private appService = inject(AppEndpointService);
  private washesService = inject(WashesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  readonly ANNUAL_REPORT = -1;

  private d = new Date();
  dateControl = new FormControl(this.d.getMonth() - 1);
  yearControl = new FormControl(this.d.getFullYear());
  clientIdControl = new FormControl('');

  loading = new BehaviorSubject(false);
  progress = new BehaviorSubject('');
  results = new BehaviorSubject<EvaluationResult[]>([]);

  constructor() {
    // Sync form controls → URL query params
    merge(
      this.dateControl.valueChanges,
      this.yearControl.valueChanges,
      this.clientIdControl.valueChanges
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.syncToUrl());
  }

  ngOnInit() {
    // Read initial values from URL query params
    const params = this.route.snapshot.queryParams;
    if (params['month'] !== undefined) {
      this.dateControl.setValue(Number(params['month']), { emitEvent: false });
    }
    if (params['year'] !== undefined) {
      this.yearControl.setValue(Number(params['year']), { emitEvent: false });
    }
    if (params['client']) {
      this.clientIdControl.setValue(params['client'], { emitEvent: false });
    }
  }

  private syncToUrl() {
    const queryParams: any = {};
    if (this.dateControl.value !== null) {
      queryParams.month = this.dateControl.value;
    }
    if (this.yearControl.value !== null) {
      queryParams.year = this.yearControl.value;
    }
    if (this.clientIdControl.value) {
      queryParams.client = this.clientIdControl.value;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }

  allSystems = this.monitorFacade.monitorItems.pipe(
    filter(Boolean),
    map((items) => (items || []).filter((s) => s.system_active && s.contract)),
    take(1)
  );

  get isAnnual(): boolean {
    return this.dateControl.value === this.ANNUAL_REPORT;
  }

  create() {
    this.loading.next(true);
    this.results.next([]);
    this.progress.next('Preparing...');

    const isAnnual = this.isAnnual;
    const month = isAnnual ? 0 : (this.dateControl.value ?? this.d.getMonth() - 1);
    const year = this.yearControl.value || this.d.getFullYear();
    const selectedDate = new Date(Date.UTC(year, month, 1));
    const dateOfFirstDay = alignDateToReport(selectedDate);

    const clientIdFilter = (this.clientIdControl.value || '').trim();

    this.allSystems
      .pipe(
        switchMap((monitorItems) => {
          const filtered = clientIdFilter
            ? monitorItems.filter((s) => s.client?.id === clientIdFilter)
            : monitorItems;
          const systemIds = filtered.map((s) => s.id);
          if (!systemIds.length) {
            return of([]);
          }

          this.progress.next(`Loading ${systemIds.length} systems...`);

          return forkJoin(
            systemIds.map((id, idx) =>
              this.createReportForSystem(id, dateOfFirstDay, isAnnual).pipe(
                map((result) => {
                  this.progress.next(
                    `${idx + 1} / ${systemIds.length}`
                  );
                  return result;
                })
              )
            )
          );
        })
      )
      .subscribe({
        next: (results) => {
          const validResults = results.filter(
            (r): r is EvaluationResult => r !== null
          );
          this.results.next(validResults);
          this.loading.next(false);
          this.progress.next(`Done - ${validResults.length} reports`);
        },
        error: (err) => {
          console.error('Report evaluation error:', err);
          this.loading.next(false);
          this.progress.next('Error: ' + (err?.message || 'Unknown'));
        },
      });
  }

  private createReportForSystem(
    systemId: string,
    date: Date,
    isAnnual: boolean
  ) {
    const from = isAnnual
      ? DateUtil.StartOfYear(+date)
      : DateUtil.StartOfMonth(+date);
    const to = isAnnual
      ? DateUtil.EndOfYear(+date)
      : DateUtil.EndOfMonth(+date);

    return this.systemsService.getById(systemId).pipe(
      filter(Boolean),
      take(1),
      switchMap((system) =>
        this.systemsService
          .getSystemsByIds(system?.location?.relatedSystems || [])
          .pipe(
            take(1),
            switchMap((relatedSystems) =>
              combineLatest([
                this.energyService
                  .getEnergyByIds(system?.location?.relatedSystems || [])
                  .pipe(map((energies) => (energies || []).filter(Boolean))),
                this.energyService.getEnergy(systemId),
                this.malfunctionsService.getUnlimitedForSystem(systemId),
                this.appService.getMalfunctionsTypes(),
                this.washesService.getBySystemId(systemId, true),
                this.appService.get('prediction').pipe(filter(Boolean)),
                this.appService.get('TaarifConstants').pipe(filter(Boolean)),
              ]).pipe(
                take(1),
                map(
                  ([
                    energies,
                    mainSystemEnergy,
                    allMalfunctions,
                    malfunctionTypes,
                    washes,
                    prediction,
                    tarifs,
                  ]) => {
                    const systemsAndEnergies: See[] = relatedSystems
                      .map((sys) => ({
                        system: sys,
                        energy: energies.find((e) => e.id === sys.id),
                      }))
                      .filter(
                        (see): see is See =>
                          !see.system.excludeFromAverage &&
                          Boolean(see.system && see.energy)
                      );

                    const meanEnergy = EnergyCalc.GetMeanCalculationReport(
                      systemsAndEnergies,
                      from,
                      to,
                      false
                    );

                    // Full-year environment for monthly breakdown
                    const yearFrom = DateUtil.StartOfYear(+date);
                    const yearTo = DateUtil.EndOfYear(+date);
                    const fullYearEnv = EnergyCalc.GetMeanCalculationReport(
                      systemsAndEnergies, yearFrom, yearTo, false
                    );
                    const envPerMonth = new Array(12).fill(0) as number[];
                    fullYearEnv.forEach(sample => {
                      // sample.time is startOfDay (local midnight), so use getMonth() (local) not getUTCMonth()
                      const m = new Date(sample.time).getMonth();
                      envPerMonth[m] += sample.valueKwh * system.KWP;
                    });

                    // Raw per-system samples grouped by month for detail popup
                    const envRawByMonth: EnvDetailSample[][] = Array.from(
                      { length: 12 },
                      () => []
                    );
                    systemsAndEnergies.forEach(({ system: relSys, energy: relEnergy }) => {
                      const list = relEnergy?.annual;
                      if (!list) return;
                      for (const e of list) {
                        if (e.time >= yearFrom && e.time <= yearTo) {
                          // Use local month to match envPerMonth grouping
                          const m = new Date(e.time).getMonth();
                          envRawByMonth[m].push({
                            systemName: relSys.name,
                            systemId: relSys.id,
                            systemKwp: relSys.KWP,
                            time: e.time,
                            valueKwh: e.valueKwh,
                            excludeFromAverage: relSys.excludeFromAverage,
                          });
                        }
                      }
                    });

                    const doc = createReport(
                      system,
                      mainSystemEnergy,
                      meanEnergy,
                      allMalfunctions,
                      malfunctionTypes,
                      washes,
                      date,
                      isAnnual,
                      prediction,
                      tarifs,
                      ''
                    );

                    if (!doc) return null;

                    const processed = createSystemReportData(
                      doc as unknown as SystemReportDoc
                    );

                    return {
                      systemId: system.id,
                      systemName: system.name,
                      clientName: system.client?.name || '—',
                      mainSystemKwp: system.KWP,
                      raw: doc,
                      processed,
                      environmentPerMonth: envPerMonth,
                      environmentRawByMonth: envRawByMonth,
                    } as EvaluationResult;
                  }
                )
              )
            )
          )
      )
    );
  }

  /** Format a timestamp or date as a readable UTC string */
  formatUtc(value: any): string {
    if (value === null || value === undefined) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toISOString().replace('T', ' ').replace('Z', ' UTC');
  }

  /** Format a short UTC date (no time) */
  formatUtcDate(value: any): string {
    if (value === null || value === undefined) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toISOString().split('T')[0] + ' UTC';
  }

  formatNumber(value: any, digits: number = 2): string {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
  }

  formatPercent(value: any): string {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return (Number(value) * 100).toFixed(1) + '%';
  }

  sumEnvEnergy(samples: { valueKwh: number }[]): number {
    if (!samples?.length) return 0;
    return samples.reduce((sum, e) => sum + (e.valueKwh || 0), 0);
  }

  openEnvDetail(item: EvaluationResult, monthIndex: number) {
    const samples = item.environmentRawByMonth[monthIndex] || [];
    this.dialog.open(EnvDetailDialogComponent, {
      data: {
        monthName: this.getMonthName(monthIndex),
        systemName: item.systemName,
        mainSystemKwp: item.mainSystemKwp,
        samples: samples.sort((a, b) => a.time - b.time),
      },
      width: '100vw',
      maxWidth: '100vw',
      height: '100vh',
      maxHeight: '100vh',
      panelClass: 'fullscreen-dialog',
    });
  }

  getMonthName(monthIndex: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return months[monthIndex] || '—';
  }
}
