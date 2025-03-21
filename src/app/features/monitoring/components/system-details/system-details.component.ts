import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import { HeaderComponent } from '../../../../core/header/header.component';
import { MonitoringFiltersComponent } from '../monitoring-filters/monitoring-filters.component';
import { DateUtil } from '../../../../core/date/DateUtil';
import { AsyncPipe, DatePipe, formatDate, JsonPipe } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { twoDecimalNumber } from '../../../../core/math/two-decimal-number';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  first,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { SystemsService } from '../../../../endpoint/systems.service';
import { SystemEnergyFacade } from '../../../../state/system-energy/system-energy.facade';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Energy } from '../../../../domain/energy';
import { System } from '../../../../domain/system';
import ApexCharts from 'apexcharts';
import { AppEndpointService } from '../../../../endpoint/app-endpoint.service';
import { AppPrediction } from '../../../../domain/app';
import { EnergyCalc } from '../../../../core/energy/energy-calculator';
import { PredictionCalculator } from '../../../../core/energy/prediction-calculator';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MalfunctionsService } from '../../../../endpoint/malfunctions.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import {
  MatTable,
  MatTableDataSource,
  MatTableModule,
} from '@angular/material/table';
import { Malfunction } from '../../../../domain/malfunction';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { CreateAlertDialogComponent } from '../create-alert-dialog/create-alert-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { EnvironmentalSystemsDialogComponent } from '../environmental-systems-dialog/environmental-systems-dialog.component';
import { SortHeaderComponent } from '../sort-header/sort-header.component';
import { SystemCommentDialogComponent } from '../system-comment-dialog/system-comment-dialog.component';
import { ManualEnergyUpdateComponent } from '../manual-energy-update/manual-energy-update.component';

@Component({
  selector: 'app-system-details',
  standalone: true,
  imports: [
    HeaderComponent,
    MonitoringFiltersComponent,
    ReactiveFormsModule,
    AsyncPipe,
    JsonPipe,
    TranslatePipe,
    MatFormField,
    MatInput,
    MatIcon,
    MatProgressSpinner,
    MatFormFieldModule,
    MatDatepickerModule,
    FormsModule,
    DatePipe,
    MatNativeDateModule,
    MatButtonModule,
    MatSort,
    MatTable,
    MatTableModule,
    MatButtonToggleModule,
    MatSortModule,
    SortHeaderComponent,
  ],
  providers: [MatNativeDateModule],
  templateUrl: './system-details.component.html',
  styleUrl: './system-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemDetailsComponent implements AfterViewInit {
  translator = new TranslatePipe();
  activeSort = new BehaviorSubject({
    sortField: 'tracingDate',
    sortDirection: 'desc',
  });

  router = inject(Router);

  sortParams = this.activeSort.pipe(
    map(({ sortField, sortDirection }) => ({
      sortField,
      sortDirection: sortDirection === 'asc' ? 1 : -1,
    }))
  );
  sums = new BehaviorSubject<
    Partial<{ energy: number; mean: number; prediction: number }>
  >({});

  now = new Date();
  thirtyDaysAgo = new Date(new Date().setDate(this.now.getDate() - 30));

  periodType = new FormControl('date');
  periodTypeChange = this.periodType.valueChanges.pipe(
    startWith(this.periodType.value)
  );

  readonly range = new FormGroup({
    start: new FormControl<Date>(this.thirtyDaysAgo),
    end: new FormControl<Date>(this.now),
  });

  malfunctionsTable = new MatTableDataSource<Malfunction>([]);
  route = inject(ActivatedRoute);
  systemsService = inject(SystemsService);
  appEndpointService = inject(AppEndpointService);
  systemEnergyFacade = inject(SystemEnergyFacade);
  destroyRef = inject(DestroyRef);
  malfunctionsService = inject(MalfunctionsService);
  matDialog = inject(MatDialog);

  systemId = this.route.params.pipe(map((params) => params['id']));

  chart?: ApexCharts;
  @ViewChild('chart', { static: true }) chartDiv?: ElementRef<HTMLDivElement>;

  generation = new BehaviorSubject<number>(0);

  systemDetails = combineLatest([
    this.appEndpointService.get('prediction').pipe(filter((p) => !!p)),
    this.route.params.pipe(map((params) => params['id'])),
    this.generation,
  ]).pipe(
    switchMap(([prediction, id]) =>
      this.systemsService
        .getById(id)
        .pipe(map((system) => ({ system, prediction })))
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  system = this.systemDetails.pipe(map(({ system }) => system));

  systemLoadRation = this.system.pipe(
    map((s) => (s?.AC ? Math.round((s.KWP / s.AC - 1) * 100) + '%' : ''))
  );

  compare(a: any, b: any, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  malfunctionsReload = new BehaviorSubject(null);
  malfunctions = this.systemId.pipe(
    switchMap((id: string) =>
      this.malfunctionsReload.pipe(
        switchMap(() =>
          this.malfunctionsService.getForSystem(id).pipe(
            switchMap((malfunctions) =>
              this.sortParams.pipe(
                tap(
                  (sorts) =>
                    (this.malfunctionsTable.data = malfunctions.sort((a, b) => {
                      const isAsc = sorts.sortDirection === 1;
                      switch (sorts.sortField) {
                        case 'tracingDate':
                          return this.compare(
                            new Date(a.tracingTime as string).getTime(),
                            new Date(b.tracingTime as string).getTime(),
                            isAsc
                          );
                        case 'closeDate':
                          return this.compare(
                            new Date(a.closeTime as string).getTime(),
                            new Date(b.closeTime as string).getTime(),
                            isAsc
                          );
                        case 'openDate':
                          return this.compare(
                            new Date(a.openTime as string).getTime(),
                            new Date(b.openTime as string).getTime(),
                            isAsc
                          );
                        case 'status':
                          return this.compare(a.status, b.status, isAsc);
                        case 'hardware':
                          return this.compare(a.severity, b.severity, isAsc);
                        default:
                          return 0;
                      }
                    }))
                )
              )
            )
          )
        )
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  systemDetailsAndEnergy = this.systemDetails.pipe(
    switchMap(({ system, prediction }) =>
      system?.id
        ? combineLatest([
            this.systemEnergyFacade.getSystemEnergy(system?.id),
            this.systemsService
              .getSystemsByIds(system?.location?.relatedSystems || [])
              .pipe(
                switchMap((relatedSystems) => {
                  const relatedMaps: { [k: string]: System } = relatedSystems
                    .filter((s) => this.isPartOfAverage(s))
                    .reduce((acc, s) => Object.assign(acc, { [s.id]: s }), {});

                  return this.systemEnergyFacade
                    .getSystemEnergyList(Object.keys(relatedMaps))
                    .pipe(
                      map((energies) =>
                        energies.map((energy) => ({
                          energy,
                          system: relatedMaps[energy.id],
                        }))
                      )
                    );
                })
              ),
          ]).pipe(
            map(([energy, relatedEnergy]) => ({
              system,
              energy,
              prediction,
              relatedEnergy,
            }))
          )
        : of(null)
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
    filter((data) => !!data)
  );

  readonly seriesNames = ['Energy', 'Environment', 'Prediction'];
  readonly seriesNamesHeb = ['תפוקה', 'סביבה', 'צפי'];

  readonly chartBaseOptions = {
    chart: {
      type: 'line',
      height: '300px',
      animations: {
        enabled: false,
      },
      tools: {
        download: false,
      },
    },
    colors: ['#039be5', '#70c265', '#fff176'],
    series: [],
    stroke: {
      width: 2,
      curve: 'smooth',
      dashArray: [0, 5, 0],
    },
    xaxis: {
      type: 'category',
      tickAmount: 0,
      labels: {
        formatter: (val: any) => {
          return this.todayView
            ? DateUtil.ToTimeString(val)
            : this.isMonthlyResolution
              ? val
                ? formatDate(val, 'MMMM yyyy', 'he')
                : ''
              : DateUtil.ToAppDate(val, '', true);
        },
      },
    },
    yaxis: {
      min: 0,
      decimalsInFloat: 2,
      labels: {
        align: 'center',
      },
    },
    annotations: {
      xaxis: [
        {
          x: -Infinity,
          borderColor: '#ff6c00',
          label: {
            orientation: 'horizontal',
            textAnchor: 'start',
            position: 'bottom',
            offsetY: -16,
            text: 'תאריך חיבור',
          },
        },
      ],
    },
    tooltip: {
      y: {
        formatter: (v: number) => twoDecimalNumber(v),
        title: {
          formatter: (seriesName: string) =>
            this.seriesNamesHeb[this.seriesNames.indexOf(seriesName)] + ': ',
        },
      },
    },
    legend: {
      formatter: (seriesName: string, opt: any) =>
        this.seriesNamesHeb[opt.seriesIndex],
    },
  };

  displayedColumns: string[] = [
    'edit',
    'hardware',
    'status',
    'tracingDate',
    'closeDate',
    'openDate',
    'reportStatus',
  ];

  get todayView() {
    return this.periodType.value === 'day';
    // const from = this.range.controls.start.value?.getTime() || 0;
    // const to = this.range.controls.end.value?.getTime() || 0;
    // return DateUtil.IsSameDay(from, to) && DateUtil.IsToday(from);
  }

  get isMonthlyResolution() {
    const from = this.range.controls.start.value?.getTime() || 0;
    const to = this.range.controls.end.value?.getTime() || 0;
    return DateUtil.DaysGap(to, from) >= 100;
  }

  selectedPeriodChanges: Observable<{ start: Date; end: Date }> =
    this.range.valueChanges.pipe(
      startWith(this.range.value),
      filter(
        (range): range is { start: Date; end: Date } =>
          !!range.start && !!range.end
      )
    );

  constructor() {
    this.periodTypeChange.pipe(takeUntilDestroyed()).subscribe((type) => {
      if (type === 'date') {
        this.range.enable();
      } else {
        this.range.disable();
      }
    });
  }

  ngAfterViewInit() {
    this.chart = new ApexCharts(
      this.chartDiv!.nativeElement,
      this.chartBaseOptions
    );
    this.chart.render();

    this.systemDetailsAndEnergy
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(({ system, energy, prediction, relatedEnergy }) =>
          combineLatest([
            this.selectedPeriodChanges,
            this.periodTypeChange,
          ]).pipe(
            map(([range, type]) => ({
              system,
              energy,
              prediction,
              relatedEnergy,
              range,
              type,
            }))
          )
        )
      )
      .subscribe(
        ({ system, energy, prediction, relatedEnergy, range, type }) => {
          if (system && energy) {
            this.pushChart(
              system,
              energy,
              prediction,
              relatedEnergy,
              range,
              type
            );
          }
        }
      );
  }

  sumValue = (v: number) => (isNaN(v) ? 'אין נתונים' : twoDecimalNumber(v));

  pushChart(
    system: System,
    energy: Partial<Energy>,
    prediction: AppPrediction,
    relatedEnergy: { system: System; energy: Energy }[],
    range: { start: Date; end: Date },
    type: string | null
  ): void {
    const systemStartTime = new Date(system.startTime).getTime() || -Infinity;

    //this.chartBaseOptions.annotations.xaxis[0].x = systemStartTime;

    let energyPath;
    let meanEnergyPath: any[];
    const predictionPath = [];

    if (this.todayView) {
      const start = new Date().setHours(0, 0, 0, 0);
      const end = Date.now();

      energyPath = (energy.daily || [])
        .filter((e) => e.time >= start && e.time <= end)
        .map((e) => ({
          x: e.time,
          y: e.valueKwh / system.KWP,
        }))
        .sort((a, b) => +a.x - +b.x);

      for (let i = 0; i < 24; i++) {
        const date = new Date();
        date.setHours(i, 0, 0, 0);
        predictionPath.push({
          x: date.getTime(),
          y: NaN,
        });
      }

      meanEnergyPath = this.getMeanCalculation(relatedEnergy, start, end, true);
    } else {
      const measureStart = range.start.getTime() || 0;

      const start = Math.max(measureStart, systemStartTime);
      const end = range.end?.getTime() || 0;

      if (!energy.annual?.length) {
        return;
      }

      energyPath = (energy.annual || [])
        .filter((e) => e.time >= start && e.time <= end)
        .map((e) => ({
          x: e.time,
          y: e.valueKwh / system.KWP,
        }))
        .sort((a, b) => +a.x - +b.x);

      meanEnergyPath = this.getMeanCalculation(
        relatedEnergy,
        measureStart,
        end
      );

      const calcedAnnualPredictionPerMonth = this.getPredictionCalculation(
        system,
        prediction
      );

      const date = new Date(start);
      date.setHours(0, 0, 0, 0);
      while (+date <= +end) {
        const m = date.getMonth();
        predictionPath.push({
          x: +date,
          y:
            (calcedAnnualPredictionPerMonth[m] || NaN) /
            DateUtil.DaysInMonth(m),
        });
        date.setDate(date.getDate() + 1);
      }
    }

    const options = {
      series: [
        {
          name: this.seriesNames[0],
          data: energyPath,
        },
        {
          name: this.seriesNames[1],
          data: meanEnergyPath.filter((e) => !isNaN(e.y)),
        },
      ],
    };

    if (predictionPath.length) {
      options.series.push({
        name: this.seriesNames[2],
        data: predictionPath,
      });
    }

    this.sums.next({
      energy: EnergyCalc.Sum(energyPath.map((e) => e.y)),
      mean: EnergyCalc.Sum(meanEnergyPath.map((e) => e.y)),
      prediction: EnergyCalc.Sum(predictionPath.map((e) => e.y)),
    });

    this.chart?.updateOptions(options, true);
  }

  moveRange(to: number) {
    const range = this.range.value;
    if (range.start && range.end) {
      const start = range.start.getTime();
      const end = range.end.getTime();
      const diff = end - start;

      const newStart = new Date(start + to * diff);
      const newEnd = new Date(end + to * diff);

      this.range.patchValue({ start: newStart, end: newEnd });
    }
  }

  getPredictionCalculation(
    system: System,
    predictions: AppPrediction
  ): number[] {
    const annual =
      EnergyCalc.Sum(system.annualPredictionPerMonth) ||
      PredictionCalculator.calcDefaultValue(system, predictions);
    const age = PredictionCalculator.calcSystemAge(
      system.startTime ? new Date(system.startTime).getTime() : Date.now(),
      predictions
    );
    const calcedAnnualPrediction = PredictionCalculator.calcProductionByAge(
      annual,
      age,
      predictions
    );
    const isTaoz = !!system.taoz;
    return PredictionCalculator.calcMonthsDistribution(
      calcedAnnualPrediction,
      isTaoz,
      predictions
    );
  }

  isPartOfAverage(system: System): boolean {
    return !!system.KWP && !system.excludeFromAverage;
  }

  getMeanCalculation(
    envEnergies: { system: System; energy: Energy }[],
    from: number,
    to: number,
    daily: boolean = false
  ) {
    const grouped = new Map<number, number[]>();

    envEnergies.forEach(({ energy, system }) => {
      const list = daily ? energy?.daily : energy?.annual;
      if (!list) return;

      for (const e of list) {
        if (e.time >= from && e.time <= to) {
          const centeredTime = daily
            ? this.startOfHour(e.time)
            : this.startOfDay(e.time);
          const valueKwh = e.valueKwh / system.KWP;

          if (!grouped.has(centeredTime)) {
            grouped.set(centeredTime, []);
          }
          grouped.get(centeredTime)?.push(valueKwh);
        }
      }
    });

    return [...grouped.entries()]
      .map(([time, values]) => ({
        x: time,
        y: EnergyCalc.Mean(values),
      }))
      .sort((a, b) => a.x - b.x);
  }

  createMalfunction() {
    this.system.pipe(first()).subscribe((system) => {
      const dialogRef = this.matDialog.open(CreateAlertDialogComponent, {
        data: {
          id: system?.id || '',
          system_name: system?.name || '',
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.malfunctionsReload.next(null);
        }
      });
    });
  }

  environmentals() {
    this.systemDetailsAndEnergy
      .pipe(first())
      .subscribe(({ system, energy, relatedEnergy }) => {
        const dialogRef = this.matDialog.open(
          EnvironmentalSystemsDialogComponent,
          {
            data: [
              { system, energy },
              ...relatedEnergy.filter((e) => this.isPartOfAverage(e.system)),
            ],
            width: '1200px',
            maxWidth: '90vw',
          }
        );
      });
  }

  manualEnergy() {
    this.systemDetailsAndEnergy
      .pipe(
        first(),
        switchMap(({ system, energy }) =>
          this.matDialog
            .open(ManualEnergyUpdateComponent, {
              data: { system, energy },
              width: '800px',
              maxWidth: '90vw',
            })
            .afterClosed()
        )
      )
      .subscribe((result) => {
        if (result) {
          this.generation.next(this.generation.value + 1);
        }
      });
  }

  startOfDay(time: number): number {
    const date = new Date(time);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  startOfHour(time: number): number {
    const date = new Date(time);
    date.setMinutes(0, 0, 0);
    return date.getTime();
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
}
