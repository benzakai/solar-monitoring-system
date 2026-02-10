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
  nYears: number[] = [];
  energy: number[] = [];

  constructor() {}

  ngOnInit() {
    let utcYear = new Date(this.date).getUTCFullYear();

    for (let i = 0; i < this.MAX_YEARS; i++) {
      this.years.unshift(Date.UTC(utcYear, 0, 1));
      this.nYears.unshift(utcYear);
      utcYear--;
    }

    this.energy = this.nYears.map(
      (y) =>
        (this.annualData.find((e) => new Date(e.time).getUTCFullYear() === y)
          ?.valueKwh || 0) / 1000
    );
  }

  ngAfterViewInit() {
    // Show the chart only if there are value
    if (this.energy.filter(Boolean).length) {
      this.buildChart();
    }
  }

  buildChart() {
    const energy = this.energy;
    const yAxis = Utilities.ChartAxis(Math.max(...energy));
    console.log(energy);
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
          data: energy,
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
