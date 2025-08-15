import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import ApexCharts from 'apexcharts';
import { System } from '../../domain/system';
import { EnergyService } from '../../endpoint/energy.service';
import {
  BehaviorSubject,
  Subject,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  takeUntil,
} from 'rxjs';

@Component({
  selector: 'app-client-systems-chart',
  standalone: true,
  template: `<div #chartDiv style="width: 100%; height: 320px"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientSystemsChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartDiv') chartDiv!: ElementRef<HTMLDivElement>;

  private systems$ = new BehaviorSubject<System[] | null>([]);
  private start$ = new BehaviorSubject<Date | string | null>(null);
  private end$ = new BehaviorSubject<Date | string | null>(null);
  private destroy$ = new Subject<void>();

  @Input()
  set systems(value: System[] | null) {
    this.systems$.next(value ?? []);
  }
  get systems(): System[] | null {
    return this.systems$.value;
  }

  @Input()
  set start(value: Date | string | null | undefined) {
    this.start$.next(value ?? null);
  }
  get start(): Date | string | null | undefined {
    return this.start$.value ?? null;
  }

  @Input()
  set end(value: Date | string | null | undefined) {
    this.end$.next(value ?? null);
  }
  get end(): Date | string | null | undefined {
    return this.end$.value ?? null;
  }

  chart?: ApexCharts;

  constructor(private energy: EnergyService) {}

  ngAfterViewInit(): void {
    this.buildChart();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chart?.destroy();
  }

  private buildChart() {
    const systems = Array.isArray(this.systems) ? this.systems : [];
    const categories = systems.map((s) => s.name);

    const options: ApexCharts.ApexOptions = {
      chart: { type: 'bar', height: 320, animations: { enabled: false } },
      series: [
        {
          name: 'production',
          data: systems.map(() => 0),
        },
      ],
      xaxis: {
        categories,
        tickPlacement: 'on',
        labels: {
          rotate: 0,
          hideOverlappingLabels: false,
          showDuplicates: true,
          trim: false,
          maxHeight: 120,
        },
      },
      yaxis: { decimalsInFloat: 0 },
      dataLabels: { enabled: false },
      plotOptions: {
        bar: { columnWidth: Math.min(systems.length * 20, 80) + '%' },
      },
      colors: ['#039be5'],
      grid: { show: true },
      tooltip: { enabled: true },
    };

    this.chart = new ApexCharts(this.chartDiv.nativeElement, options);
    this.chart.render();
    const inputs$ = combineLatest([
      this.systems$.pipe(
        distinctUntilChanged((a, b) => {
          const lenA = Array.isArray(a) ? a.length : 0;
          const lenB = Array.isArray(b) ? b.length : 0;
          if (lenA !== lenB) return false;
          if (!lenA && !lenB) return true;
          const idsA = (a || []).map((s) => s.id).join('|');
          const idsB = (b || []).map((s) => s.id).join('|');
          return idsA === idsB;
        })
      ),
      this.start$.pipe(
        distinctUntilChanged((x, y) => {
          if (!x && !y) return true;
          const tx = x ? new Date(x).setHours(0, 0, 0, 0) : NaN;
          const ty = y ? new Date(y).setHours(0, 0, 0, 0) : NaN;
          return tx === ty;
        })
      ),
      this.end$.pipe(
        distinctUntilChanged((x, y) => {
          if (!x && !y) return true;
          const tx = x ? new Date(x).setHours(23, 59, 59, 999) : NaN;
          const ty = y ? new Date(y).setHours(23, 59, 59, 999) : NaN;
          return tx === ty;
        })
      ),
    ]);

    inputs$
      .pipe(
        takeUntil(this.destroy$),
        switchMap(([systemsVal, startVal, endVal]) => {
          const safeSystems = Array.isArray(systemsVal) ? systemsVal : [];
          const cats = safeSystems.map((s) => s.name);
          this.chart?.updateOptions(
            {
              xaxis: {
                categories: cats,
                tickPlacement: 'on',
                labels: {
                  rotate: cats.length > 6 ? -45 : 0,
                  rotateAlways: cats.length > 6,
                  hideOverlappingLabels: false,
                  showDuplicates: true,
                  trim: false,
                  maxHeight: 120,
                },
              },
              plotOptions: {
                bar: {
                  columnWidth: Math.min(cats.length * 20, 80) + '%',
                },
              },
            } as any,
            false,
            true
          );

          if (safeSystems.length === 0) {
            return of([] as number[]);
          }

          const startMs = startVal
            ? new Date(startVal).setHours(0, 0, 0, 0)
            : NaN;
          const endMs = endVal
            ? new Date(endVal).setHours(23, 59, 59, 999)
            : NaN;

          return combineLatest(
            safeSystems.map((s) => this.energy.getEnergy(s.id))
          ).pipe(
            map((energies) =>
              energies.map((e, idx) => {
                if (!e) return 0;
                if (!isNaN(startMs) && !isNaN(endMs)) {
                  const total = [...(e.daily || []), ...(e.annual || [])]
                    .filter((d) => {
                      return d.time >= startMs && d.time <= endMs;
                    })
                    .reduce((p, c) => p + c.valueKwh, 0);
                  const kwp = Number(safeSystems[idx].KWP || 1);
                  return kwp ? +(total / kwp).toFixed(2) : 0;
                } else {
                  const endTs = Date.now();
                  const startTs = endTs - 31 * 24 * 60 * 60 * 1000;
                  const total = (e.daily || [])
                    .filter((d) => d.time >= startTs && d.time <= endTs)
                    .reduce((p, c) => p + c.valueKwh, 0);
                  const kwp = Number(safeSystems[idx].KWP || 1);
                  return kwp ? +(total / kwp).toFixed(2) : 0;
                }
              })
            )
          );
        })
      )
      .subscribe((data) => {
        this.chart?.updateSeries([{ name: 'production', data }], false);
      });
  }

  // Removed rebuildOrUpdate and updateData in favor of reactive inputs pipeline
}
