import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import ApexCharts from 'apexcharts';
import { DateUtil } from '../../../../../core/date/DateUtil';
import { formatDate } from '@angular/common';
import { Utilities } from '../../../../../core/math/utilities';

@Component({
  selector: 'app-annual-chart',
  templateUrl: './annual-chart.component.html',
  standalone: true,
  styleUrls: ['./annual-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnualChartComponent implements AfterViewInit {
  chart?: ApexCharts;

  @ViewChild('chartDiv') chartDiv!: ElementRef<HTMLDivElement>;

  @Input() productionPerMonth: number[] = [];
  @Input() productionPerMonthLastYear: number[] = [];
  @Input() predictionPerMonth: number[] = [];

  @Input() date: number = NaN;

  constructor() {}

  ngAfterViewInit() {
    this.buildChart();
  }

  buildChart() {
    const yAxis = Utilities.ChartAxis(
      Math.max(
        ...[
          ...this.productionPerMonth,
          ...this.productionPerMonthLastYear,
          ...this.predictionPerMonth,
        ]
      )
    );
    const options = {
      chart: {
        height: 300,
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
      colors: ['#039be5', '#70c265', '#000000'],
      series: [
        {
          name: new Date(this.date).getFullYear(),
          type: 'column',
          data: this.productionPerMonth,
        },
        {
          name: new Date(this.date).getFullYear() - 1,
          type: 'column',
          data: this.productionPerMonthLastYear,
        },
        {
          name: 'צפי חודשי',
          type: 'line',
          data: this.predictionPerMonth,
        },
      ],
      xaxis: {
        categories: DateUtil.GetMonths().map((v) => formatDate(v, 'MMM', 'he')),
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        labels: {
          trim: true,
          rotate: 0,
          hideOverlappingLabels: false,
          style: {
            fontSize: 8,
          },
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
          text: 'kWh',
          offsetX: -32,
        },
      },
      stroke: {
        width: 0,
      },
      markers: {
        size: [0, 0, 3],
        strokeWidth: 0,
      },
      plotOptions: {
        bar: {
          columnWidth: '75%',
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'start',
        markers: {
          offsetX: 5,
          // fillColors: ['#ffffff', '#000000'],
          strokeWidth: 5,
          width: 15,
          height: 15,
        },
        inverseOrder: true,
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
