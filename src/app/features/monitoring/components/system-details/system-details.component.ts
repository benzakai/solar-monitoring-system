import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import { HeaderComponent } from '../../../../core/header/header.component';
import { MonitoringFiltersComponent } from '../monitoring-filters/monitoring-filters.component';
import { DateUtil } from '../../../../core/date/DateUtil';
import { AsyncPipe, formatDate, JsonPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { twoDecimalNumber } from '../../../../core/math/two-decimal-number';
import { ActivatedRoute } from '@angular/router';
import {
  map,
  shareReplay,
  startWith,
  switchMap,
  combineLatest,
  filter,
  of,
} from 'rxjs';
import { SystemsService } from '../../../../endpoint/systems.service';
import { SystemEnergyFacade } from '../../../../state/system-energy/system-energy.facade';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Energy, EnergySample } from '../../../../domain/energy';
import { System } from '../../../../domain/system';
import ApexCharts from 'apexcharts';
import { AppEndpointService } from '../../../../endpoint/app-endpoint.service';
import { AppPrediction } from '../../../../domain/app';
import { EnergyCalc } from '../../../../core/energy/energy-calculator';
import { PredictionCalculator } from '../../../../core/energy/prediction-calculator';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MalfunctionsService } from '../../../../endpoint/malfunctions.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

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
  ],
  templateUrl: './system-details.component.html',
  styleUrl: './system-details.component.css',
})
export class SystemDetailsComponent implements AfterViewInit {
  translator = new TranslatePipe();

  route = inject(ActivatedRoute);
  systemsService = inject(SystemsService);
  appEndpointService = inject(AppEndpointService);
  systemEnergyFacade = inject(SystemEnergyFacade);
  destroyRef = inject(DestroyRef);
  malfunctionsService = inject(MalfunctionsService);

  systemId = this.route.params.pipe(map((params) => params['id']));

  chart?: ApexCharts;
  @ViewChild('chart', { static: true }) chartDiv?: ElementRef<HTMLDivElement>;

  systemDetails = combineLatest([
    this.appEndpointService.get('prediction').pipe(filter((p) => !!p)),
    this.route.params.pipe(map((params) => params['id'])),
  ]).pipe(
    switchMap(([prediction, id]) =>
      this.systemsService
        .getById(id)
        .pipe(map((system) => ({ system, prediction })))
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  malfunctions = this.systemId.pipe(
    switchMap((id) => this.malfunctionsService.getForSystem(id)),
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

  selectedPeriod = new FormGroup({
    start: new FormControl(),
    end: new FormControl(),
  });

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
        rotate: 45,
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
            text: this.translator.transform('start_time'),
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

  get todayView() {
    const from = this.selectedPeriod.controls.start.value;
    const to = this.selectedPeriod.controls.end.value;
    return DateUtil.IsSameDay(from, to) && DateUtil.IsToday(from);
  }

  get isMonthlyResolution() {
    const from = this.selectedPeriod.controls.start.value;
    const to = this.selectedPeriod.controls.end.value;
    return DateUtil.DaysGap(to, from) >= 100;
  }

  selectedPeriodChanges = this.selectedPeriod.valueChanges.pipe(
    startWith(this.selectedPeriod.value as { from: Date; to: Date })
  );

  ngAfterViewInit() {
    this.chart = new ApexCharts(
      this.chartDiv!.nativeElement,
      this.chartBaseOptions
    );
    this.chart.render();

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    this.selectedPeriod.controls.start.setValue(thirtyDaysAgo);
    this.selectedPeriod.controls.end.setValue(now);

    this.systemDetailsAndEnergy
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ system, energy, prediction, relatedEnergy }) => {
        if (system && energy) {
          this.pushChart(system, energy, prediction, relatedEnergy);
        }
      });
  }

  pushChart(
    system: System,
    energy: Partial<Energy>,
    prediction: AppPrediction,
    relatedEnergy: { system: System; energy: Energy }[]
  ): void {
    const systemStartTime = new Date(system.startTime).getTime() || -Infinity;
    this.chartBaseOptions.annotations.xaxis[0].x = systemStartTime;

    const measureStart = +this.selectedPeriod.controls.start.value;

    const start = Math.max(measureStart, systemStartTime);
    const end = +this.selectedPeriod.controls.end.value;

    if (!energy.annual?.length) {
      return;
    }

    const energyPath = (energy.annual || [])
      .filter((e) => e.time >= start && e.time <= end)
      .map((e) => ({
        x: e.time,
        y: e.valueKwh / system.KWP,
      }))
      .sort((a, b) => +a.x - +b.x);

    const calcedAnnualPredictionPerMonth = this.getPredictionCalculation(
      system,
      prediction
    );

    const predictionPath = [];
    const date = new Date(start);
    date.setHours(0, 0, 0, 0);
    while (+date <= +end) {
      const m = date.getMonth();
      predictionPath.push({
        x: +date,
        y: (calcedAnnualPredictionPerMonth[m] || NaN) / DateUtil.DaysInMonth(m),
      });
      date.setDate(date.getDate() + 1);
    }

    const meanEnergyPath = this.getMeanCalculation(
      relatedEnergy,
      measureStart,
      end
    );

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
        {
          name: this.seriesNames[2],
          data: predictionPath,
        },
      ],
    };

    this.chart?.updateOptions(options, true);
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
    const normalizedAnnual: EnergySample[][] = [];

    envEnergies.forEach(({ energy, system }) => {
      const list = daily ? energy?.daily : energy?.annual;
      const res = (list || [])
        .filter((e) => e.time >= from && e.time <= to)
        .map((e) => ({
          time: e.time,
          valueKwh: e.valueKwh / system.KWP,
        }));
      normalizedAnnual.push(res);
    });

    const all = ([] as EnergySample[]).concat(...normalizedAnnual);
    const timestamps = new Set<number>(all.map((e) => e.time));
    return [...timestamps.values()].map((time) => {
      const mean = EnergyCalc.Mean(
        all.filter((e) => e.time === time).map((e) => e.valueKwh)
      );
      return {
        x: time,
        y: mean,
      };
    });
  }
}
