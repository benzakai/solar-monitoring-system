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
import { HeaderPortalRemoteComponent } from '../../../../core/header/header-portal-remote.component';
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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
import { ManualEnergyUpdateComponent } from '../manual-energy-update/manual-energy-update.component';
import { EnvironmentalEnergyService } from '../../../../endpoint/environmental-energy.service';
import { PeopleService } from '../../../../endpoint/people.service';
import { LanguageService } from '../../../../core/lang/language.service';
import { EnergyService } from '../../../../endpoint/energy.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-system-details',
  standalone: true,
  imports: [
    HeaderComponent,
    HeaderPortalRemoteComponent,
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
    RouterModule,
  ],
  providers: [MatNativeDateModule],
  templateUrl: './system-details.component.html',
  styleUrl: './system-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemDetailsComponent implements AfterViewInit {
  translator = new TranslatePipe();
  people = inject(PeopleService);
  languageService = inject(LanguageService);
  energyService = inject(EnergyService);
  snackBar = inject(MatSnackBar);
  protected readonly DateUtil = DateUtil;

  // Store current chart data for click handling
  currentMonthlyChartData: {
    calculatedData: { x: number; y: number }[];
    multiAnnualData: { x: number; y: number }[];
    predictionData: { x: number; y: number }[];
    system: System | null;
  } | null = null;
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
  environmentalEnergyService = inject(EnvironmentalEnergyService);
  destroyRef = inject(DestroyRef);
  malfunctionsService = inject(MalfunctionsService);
  matDialog = inject(MatDialog);

  systemId = this.route.params.pipe(map((params) => params['id']));

  chart?: ApexCharts;
  monthsChart?: ApexCharts;
  @ViewChild('chart', { static: true }) chartDiv?: ElementRef<HTMLDivElement>;
  @ViewChild('monthsChartDiv', { static: false })
  monthsChartDiv?: ElementRef<HTMLDivElement>;

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

  client = this.systemDetails.pipe(
    map(
      (details) => details?.system?.client?.id || details?.system?.client?._id
    ),
    switchMap((id) =>
      id ? this.people.getById(id) : of({ clientName: '', name: '', _id: '' })
    )
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
          this.malfunctionsService.getUnlimitedForSystem(id).pipe(
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
      this.environmentalEnergyService.getEnvironmentalEnergies(
        system,
        prediction
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
    filter((data) => !!data)
  );

  monthlyChartData = this.systemDetailsAndEnergy.pipe(
    map(({ energy, system, prediction }) => {
      const multiAnnual = energy?.multiAnnual || [];
      const annual = energy?.annual || [];

      if (multiAnnual.length === 0 && annual.length === 0) {
        return {
          calculatedData: [],
          multiAnnualData: [],
          predictionData: [],
          system,
        };
      }

      // Sort chronologically from oldest to newest
      const sortedMultiAnnual = [...multiAnnual].sort(
        (a, b) => a.time - b.time
      );
      const sortedAnnual = [...annual].sort((a, b) => a.time - b.time);

      // Get date range - from first data point to current month (using UTC)
      const firstMultiAnnual = sortedMultiAnnual[0]?.time || Infinity;
      const firstAnnual = sortedAnnual[0]?.time || Infinity;
      const firstTime = Math.min(firstMultiAnnual, firstAnnual);

      if (firstTime === Infinity) {
        return {
          calculatedData: [],
          multiAnnualData: [],
          predictionData: [],
          system,
        };
      }

      // Use UTC for consistent timestamps
      const firstDateObj = new Date(firstTime);
      const firstYear = firstDateObj.getUTCFullYear();
      const firstMonth = firstDateObj.getUTCMonth();

      const nowObj = new Date();
      const lastYear = nowObj.getUTCFullYear();
      const lastMonth = nowObj.getUTCMonth();

      // Generate all months in the range using UTC timestamps
      const allMonthTimestamps: number[] = [];
      let currentYear = firstYear;
      let currentMonth = firstMonth;

      while (
        currentYear < lastYear ||
        (currentYear === lastYear && currentMonth <= lastMonth)
      ) {
        allMonthTimestamps.push(
          Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0)
        );
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
      }

      // Create two series: calculated from daily and multiAnnual
      const calculatedData: { x: number; y: number }[] = [];
      const multiAnnualData: { x: number; y: number }[] = [];

      allMonthTimestamps.forEach((monthTimestamp) => {
        const monthDate = new Date(monthTimestamp);
        const monthUtc = monthDate.getUTCMonth();
        const yearUtc = monthDate.getUTCFullYear();

        // Calculate from annual (daily) data - RED
        const monthStart = monthTimestamp;
        const monthEnd = Date.UTC(yearUtc, monthUtc + 1, 1, 0, 0, 0, 0);

        const dailyForMonth = sortedAnnual.filter(
          (e) => e.time >= monthStart && e.time < monthEnd
        );
        const calculatedValue = dailyForMonth.reduce(
          (sum, e) => sum + e.valueKwh,
          0
        );
        calculatedData.push({ x: monthTimestamp, y: calculatedValue });

        // Data from multiAnnual - BLUE (compare using UTC month/year)
        const found = sortedMultiAnnual.find((e) => {
          const eDate = new Date(e.time);
          return (
            eDate.getUTCMonth() === monthUtc &&
            eDate.getUTCFullYear() === yearUtc
          );
        });
        multiAnnualData.push({ x: monthTimestamp, y: found?.valueKwh || 0 });
      });

      // Create prediction data for each month
      const predictionCalc = PredictionCalculator.getPredictionCalculation(
        system,
        prediction
      );
      const predictionData = allMonthTimestamps.map((monthTimestamp) => ({
        x: monthTimestamp,
        y: predictionCalc[new Date(monthTimestamp).getUTCMonth()] || 0,
      }));

      return { calculatedData, multiAnnualData, predictionData, system };
    }),
    shareReplay({ bufferSize: 1, refCount: true })
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

  get isMonthsView() {
    return this.periodType.value === 'months';
  }

  constructor() {
    this.periodTypeChange.pipe(takeUntilDestroyed()).subscribe((type) => {
      if (type === 'date') {
        this.range.enable();
      } else {
        this.range.disable();
      }
    });

    // Subscribe to months chart data
    this.periodTypeChange
      .pipe(
        takeUntilDestroyed(),
        filter((type) => type === 'months'),
        switchMap(() => this.monthlyChartData)
      )
      .subscribe((chartData) => {
        setTimeout(() => this.buildMonthsChart(chartData));
      });
  }

  buildMonthsChart(chartData: {
    calculatedData: { x: number; y: number }[];
    multiAnnualData: { x: number; y: number }[];
    predictionData: { x: number; y: number }[];
    system: System | null;
  }) {
    if (!this.monthsChartDiv?.nativeElement) return;

    // Store chart data for click handling
    this.currentMonthlyChartData = chartData;

    // Destroy existing chart
    this.monthsChart?.destroy();

    const lang = this.languageService.getCurrentLang();
    const calculatedLabel =
      lang === 'he' ? 'חישוב מימים (לחץ להוספה)' : 'Calculated (click to add)';
    const multiAnnualLabel = lang === 'he' ? 'נתוני חודש' : 'Monthly data';
    const predictionLabel = lang === 'he' ? 'צפי' : 'Prediction';

    const options = {
      chart: {
        type: 'bar',
        height: 300,
        toolbar: { show: false },
        animations: { enabled: false },
        events: {
          dataPointSelection: (event: any, chartContext: any, config: any) => {
            this.onMonthsChartClick(config.seriesIndex, config.dataPointIndex);
          },
        },
      },
      states: {
        hover: {
          filter: { type: 'lighten', value: 0.15 },
        },
        active: {
          filter: { type: 'darken', value: 0.35 },
        },
      },
      colors: ['#e53935', '#039be5', '#fff176'],
      series: [
        {
          name: calculatedLabel,
          type: 'column',
          data: chartData.calculatedData,
        },
        {
          name: multiAnnualLabel,
          type: 'column',
          data: chartData.multiAnnualData,
        },
        {
          name: predictionLabel,
          type: 'line',
          data: chartData.predictionData,
        },
      ],
      xaxis: {
        type: 'category',
        labels: {
          formatter: (val: any) => (val ? formatDate(val, 'MMM yy', lang) : ''),
          rotate: -45,
          rotateAlways: true,
          style: { fontSize: '10px' },
        },
      },
      yaxis: {
        min: 0,
        decimalsInFloat: 0,
        labels: { align: 'center' },
        title: { text: 'kWh' },
      },
      stroke: { width: [0, 0, 2] },
      markers: { size: [0, 0, 3] },
      plotOptions: {
        bar: {
          columnWidth: '80%',
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
      },
      dataLabels: { enabled: false },
      tooltip: {
        x: {
          formatter: (val: any) =>
            val ? formatDate(val, 'MMMM yyyy', lang) : '',
        },
        y: {
          formatter: (v: number) => twoDecimalNumber(v) + ' kWh',
        },
      },
    };

    this.monthsChart = new ApexCharts(
      this.monthsChartDiv.nativeElement,
      options
    );
    this.monthsChart.render();
  }

  onMonthsChartClick(seriesIndex: number, dataPointIndex: number) {
    // Only handle clicks on the red (calculated) series - seriesIndex 0
    if (seriesIndex !== 0) return;

    if (!this.currentMonthlyChartData || !this.currentMonthlyChartData.system)
      return;

    const calculatedPoint =
      this.currentMonthlyChartData.calculatedData[dataPointIndex];
    const multiAnnualPoint =
      this.currentMonthlyChartData.multiAnnualData[dataPointIndex];

    // Only save if there's a calculated value and it's different from multiAnnual
    if (calculatedPoint.y <= 0) return;

    const lang = this.languageService.getCurrentLang();
    const monthName = formatDate(calculatedPoint.x, 'MMMM yyyy', lang);
    const confirmMsg =
      lang === 'he'
        ? `להוסיף ${twoDecimalNumber(calculatedPoint.y)} kWh ל-${monthName}?`
        : `Add ${twoDecimalNumber(calculatedPoint.y)} kWh to ${monthName}?`;

    if (confirm(confirmMsg)) {
      this.saveCalculatedToMultiAnnual(
        this.currentMonthlyChartData.system.id,
        calculatedPoint.x,
        calculatedPoint.y
      );
    }
  }

  saveCalculatedToMultiAnnual(
    systemId: string,
    timestamp: number,
    value: number
  ) {
    const lang = this.languageService.getCurrentLang();

    this.energyService
      .addMultiAnnualEntry(systemId, {
        time: timestamp,
        valueKwh: value,
      })
      .subscribe({
        next: () => {
          const successMsg =
            lang === 'he' ? 'הנתון נשמר בהצלחה' : 'Data saved successfully';
          this.snackBar.open(successMsg, '✓', { duration: 3000 });
          // Refresh the data
          this.generation.next(this.generation.value + 1);
        },
        error: (err) => {
          const errorMsg =
            lang === 'he' ? 'שגיאה בשמירת הנתון' : 'Error saving data';
          this.snackBar.open(errorMsg, '✗', { duration: 3000 });
          console.error('Error saving multiAnnual entry:', err);
        },
      });
  }

  ngAfterViewInit() {
    this.chart = new ApexCharts(
      this.chartDiv!.nativeElement,
      this.chartBaseOptions
    );

    setTimeout(() => {
      this.chart?.render();

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
    });
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

    type ChartPoint = { x: number; y: number };
    let energyPath: ChartPoint[];
    let meanEnergyPath: ChartPoint[];
    const predictionPath: ChartPoint[] = [];

    if (this.todayView) {
      const start = new Date().setHours(0, 0, 0, 0);
      const end = Infinity;

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

      meanEnergyPath = EnergyCalc.GetMeanCalculation(
        relatedEnergy,
        start,
        end,
        true
      );
    } else {
      const measureStart = range.start.getTime() || 0;

      const start = Math.max(measureStart, systemStartTime);
      const end = range.end?.getTime() || 0;

      energyPath = (energy.annual || [])
        .filter((e) => e.time >= start && e.time <= end)
        .map((e) => {
          return {
            x: e.time,
            y: e.valueKwh / system.KWP,
          };
        })
        .sort((a, b) => +a.x - +b.x);

      meanEnergyPath = EnergyCalc.GetMeanCalculation(
        relatedEnergy,
        measureStart,
        end
      );

      const calcedAnnualPredictionPerMonth =
        PredictionCalculator.getPredictionCalculation(system, prediction);

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
              ...relatedEnergy.filter((e) =>
                EnergyCalc.IsPartOfAverage(e.system)
              ),
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
              width: '1000px',
              maxWidth: '90vw',
            })
            .afterClosed()
        )
      )
      .subscribe((result) => {
        if (result) {
          setTimeout(() => this.generation.next(this.generation.value + 1));
        }
      });
  }

  gotoEdit(id: string) {
    this.router.navigate(['/system-settings', id]);
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
