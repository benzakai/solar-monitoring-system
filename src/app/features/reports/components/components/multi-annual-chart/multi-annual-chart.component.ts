import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { formatDate } from '@angular/common';
import ApexCharts from 'apexcharts';
import { DateUtil } from '../../../../../core/date/DateUtil';
import { EnergySample } from '../../../../../domain/energy';
import { Utilities } from '../../../../../core/math/utilities';

@Component({
  selector: 'app-multi-annual-chart',
  templateUrl: './multi-annual-chart.component.html',
  standalone: true,
  styleUrls: ['./multi-annual-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiAnnualChartComponent implements OnInit, AfterViewInit {
  readonly MAX_YEARS: number = 5;

  chart?: ApexCharts;

  @ViewChild('chartDiv') chartDiv!: ElementRef<HTMLDivElement>;

  @Input() annualData: EnergySample[] = [];
  @Input() date: number = NaN;

  years: number[] = [];
  energy: number[] = [];

  constructor() {}

  ngOnInit() {
    // Get 5 years back
    const date = new Date(this.date);
    for (let i = 0; i < this.MAX_YEARS; i++) {
      this.years.unshift(+date);
      date.setFullYear(date.getFullYear() - 1);
    }
    // Find the annual energy for each year
    this.energy = this.years.map(
      (y) =>
        (this.annualData.find((e) => DateUtil.IsSameYear(e.time, y))
          ?.valueKwh || NaN) / 1000
    );
  }

  ngAfterViewInit() {
    // Show the chart only if there are value
    if (this.energy.filter(Boolean).length) {
      this.buildChart();
    }
  }

  buildChart() {
    const yAxis = Utilities.ChartAxis(Math.max(...this.energy.filter(Boolean)));
    const options = {
      chart: {
        height: 320,
        width: '100%',
        toolbar: {
          show: false,
        },
        animations: {
          enabled: false,
        },
        zoom: {
          enabled: false,
        },
      },
      grid: {
        show: true,
      },
      colors: ['#e6dc10', '#ccd311', '#81ba30', '#41c1de', '#0d80c8'],
      series: [
        {
          name: 'רב-שנתי',
          type: 'column',
          data: this.energy,
        },
        {
          name: 'HACK-for-color-2',
          type: 'column',
          data: [],
        },
        {
          name: 'HACK-for-color-3',
          type: 'column',
          data: [],
        },
        {
          name: 'HACK-for-color-4',
          type: 'column',
          data: [],
        },
        {
          name: 'HACK-for-color-5',
          type: 'column',
          data: [],
        },
      ],
      xaxis: {
        categories: this.years.map((y) => formatDate(y, 'yyyy', 'he')),
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        labels: {
          trim: true,
          rotate: 45,
          rotateAlways: true,
          hideOverlappingLabels: false,
          style: {
            fontSize: 8,
          },
          offsetX: -2,
          // offsetY: 5,
        },
      },
      yaxis: {
        min: 0,
        max: yAxis.maxValue,
        tickAmount: yAxis.tickAmount,
        decimalsInFloat: 0,
        labels: {
          align: 'center',
        },
        title: {
          text: 'mWh',
          offsetX: -32,
        },
      },
      stroke: {
        width: 0,
      },
      markers: {
        size: 0,
        strokeWidth: 0,
      },
      plotOptions: {
        bar: {
          columnWidth: '75%',
          distributed: true,
        },
      },
      legend: {
        show: false,
      },
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        enabled: false,
      },
    };
    this.chart = new ApexCharts(this.chartDiv!.nativeElement, options);
    this.chart.render();
  }
}
