import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { AsyncPipe, formatDate } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import ApexCharts from 'apexcharts';
import { DateUtil } from '../../../../core/date/DateUtil';
import { HeaderPortalRemoteComponent } from '../../../../core/header/header-portal-remote.component';
import { SystemsService } from '../../../../endpoint/systems.service';
import { EnergyService } from '../../../../endpoint/energy.service';
import { Energy, EnergySample } from '../../../../domain/energy';
import { System } from '../../../../domain/system';

type EnergyPeriod = 'HOUR' | 'DAY' | 'MONTH';

@Component({
  selector: 'app-system-energy-refetch',
  standalone: true,
  imports: [
    HeaderPortalRemoteComponent,
    ReactiveFormsModule,
    AsyncPipe,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatIconModule,
  ],
  providers: [MatNativeDateModule],
  templateUrl: './system-energy-refetch.component.html',
  styleUrl: './system-energy-refetch.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemEnergyRefetchComponent implements AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly systemsService = inject(SystemsService);
  private readonly energyService = inject(EnergyService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AngularFireAuth);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly refetchEndpoint =
    'https://us-central1-solar-golan.cloudfunctions.net/runSingleSystemEnergy';

  @ViewChild('chart', { static: true }) chartDiv?: ElementRef<HTMLDivElement>;

  chart?: ApexCharts;
  refetching = new BehaviorSubject(false);
  reload = new BehaviorSubject(0);

  readonly periodControl = new FormControl<EnergyPeriod>('HOUR', {
    nonNullable: true,
  });
  readonly range = new FormGroup({
    start: new FormControl<Date>(new Date(), { nonNullable: true }),
    end: new FormControl<Date>(new Date(), { nonNullable: true }),
  });

  readonly periods: EnergyPeriod[] = ['HOUR', 'DAY', 'MONTH'];

  readonly systemId = this.route.params.pipe(
    map((params) => params['id'] as string),
    filter(Boolean),
    distinctUntilChanged()
  );

  readonly system = this.systemId.pipe(
    switchMap((id) => this.systemsService.getById(id)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly energy = combineLatest([this.systemId, this.reload]).pipe(
    switchMap(([id]) => this.energyService.getEnergy(id)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    this.periodControl.valueChanges
      .pipe(startWith(this.periodControl.value), takeUntilDestroyed())
      .subscribe((period) => this.applyDefaultRange(period));
  }

  ngAfterViewInit() {
    this.chart = new ApexCharts(this.chartDiv!.nativeElement, {
      chart: {
        type: 'line',
        height: '340px',
        animations: { enabled: false },
        toolbar: { show: false },
      },
      series: [],
      colors: ['#039be5'],
      stroke: { width: 2, curve: 'smooth' },
      dataLabels: { enabled: false },
      xaxis: { type: 'category' },
      yaxis: { min: 0, decimalsInFloat: 2, labels: { align: 'center' } },
      tooltip: {
        y: {
          formatter: (value: number) => value.toFixed(2),
        },
      },
    });
    this.chart.render();

    combineLatest([
      this.system,
      this.energy,
      this.periodControl.valueChanges.pipe(startWith(this.periodControl.value)),
      this.range.valueChanges.pipe(startWith(this.range.value)),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([system, energy, period]) => {
        this.pushChart(system, energy, period);
      });
  }

  selectedTabIndex() {
    return this.periods.indexOf(this.periodControl.value);
  }

  onTabChange(index: number) {
    const selected = this.periods[index] || 'HOUR';
    this.periodControl.setValue(selected);
  }

  async refetch() {
    const currentSystemId = await firstValueFrom(this.systemId);
    const period = this.periodControl.value;
    const range = this.getNormalizedRange(period);

    this.refetching.next(true);
    try {
      const user = await this.auth.currentUser;
      if (!user) {
        throw new Error('Brak zalogowanego użytkownika');
      }

      const idToken = await user.getIdToken();
      await firstValueFrom(
        this.http.post(
          this.refetchEndpoint,
          {
            systemId: currentSystemId,
            period,
            from: range.from,
            to: range.to,
          },
          {
            headers: new HttpHeaders({
              Authorization: `Bearer ${idToken}`,
            }),
          }
        )
      );

      this.snackBar.open('Refetch uruchomiony', 'OK', { duration: 2500 });
      this.reload.next(this.reload.value + 1);
    } catch (error: any) {
      const message =
        error?.error?.message ||
        error?.message ||
        'Nie udało się uruchomić refetch';
      this.snackBar.open(message, 'Zamknij', { duration: 4500 });
    } finally {
      this.refetching.next(false);
    }
  }

  private applyDefaultRange(period: EnergyPeriod) {
    const now = new Date();
    if (period === 'HOUR') {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      this.range.patchValue({ start: today, end: today }, { emitEvent: false });
      return;
    }

    if (period === 'DAY') {
      const from = new Date(now);
      from.setDate(from.getDate() - 12);
      from.setHours(0, 0, 0, 0);
      this.range.patchValue({ start: from, end: now }, { emitEvent: false });
      return;
    }

    const monthStart = new Date(now);
    monthStart.setMonth(monthStart.getMonth() - 12, 1);
    monthStart.setHours(0, 0, 0, 0);
    this.range.patchValue({ start: monthStart, end: now }, { emitEvent: false });
  }

  private getNormalizedRange(period: EnergyPeriod): { from: number; to: number } {
    const start = this.range.controls.start.value || new Date();
    const end = this.range.controls.end.value || start;

    if (period === 'HOUR') {
      const day = start;
      const from = new Date(day);
      from.setHours(0, 0, 0, 0);

      const to = new Date(day);
      to.setHours(23, 59, 59, 999);
      return { from: +from, to: +to };
    }

    const from = new Date(start);
    from.setHours(0, 0, 0, 0);

    const to = new Date(end);
    to.setHours(23, 59, 59, 999);

    return { from: +from, to: +to };
  }

  private pushChart(system: System | null, energy: Energy | null, period: EnergyPeriod) {
    const points = this.getPoints(system, energy, period);
    const options = {
      series: [
        {
          name: 'Energy',
          data: points,
        },
      ],
      xaxis: {
        type: 'category',
        labels: {
          formatter: (value: any) => this.formatXAxis(value, period),
        },
      },
    };
    this.chart?.updateOptions(options, true);
  }

  private getPoints(
    system: System | null,
    energy: Energy | null,
    period: EnergyPeriod
  ): { x: number; y: number }[] {
    const { from, to } = this.getNormalizedRange(period);
    const source = this.pickPeriodSource(energy, period);
    const kwp = system?.KWP || 1;

    return source
      .filter((sample) => sample.time >= from && sample.time <= to)
      .sort((a, b) => a.time - b.time)
      .map((sample) => ({
        x: sample.time,
        y: sample.valueKwh / kwp,
      }));
  }

  private pickPeriodSource(energy: Energy | null, period: EnergyPeriod): EnergySample[] {
    if (!energy) {
      return [];
    }
    if (period === 'HOUR') {
      return energy.daily || [];
    }
    if (period === 'DAY') {
      return energy.annual || [];
    }
    return energy.multiAnnual || [];
  }

  private formatXAxis(value: number, period: EnergyPeriod): string {
    if (!value) {
      return '';
    }
    if (period === 'HOUR') {
      return DateUtil.ToTimeString(value);
    }
    if (period === 'MONTH') {
      return formatDate(value, 'MMM yyyy', 'he');
    }
    return DateUtil.ToAppDate(value, '', true);
  }
}
