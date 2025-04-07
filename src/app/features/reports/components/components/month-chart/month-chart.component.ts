import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import ApexCharts from 'apexcharts';
import { formatDate } from '@angular/common';
import { EnergySample } from '../../../../../domain/energy';
import { DateUtil } from '../../../../../core/date/DateUtil';
// @ts-ignore
import { Utilities } from '../../../../../core/math/utilities';

@Component({
  selector: 'app-month-chart',
  templateUrl: './month-chart.component.html',
  standalone: true,
  styleUrls: ['./month-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthChartComponent implements AfterViewInit {
  chart?: ApexCharts;

  @ViewChild('chartDiv') chartDiv!: ElementRef<HTMLDivElement>;

  @Input() monthProduction: EnergySample[] = [];
  @Input() environmentProduction: EnergySample[] = [];
  @Input() washesDates: number[] = [];
  @Input() malfunctionsStartDates: number[] = [];
  @Input() malfunctionsEndDates: number[] = [];

  highestPoint: number = 0;

  constructor() {}

  ngAfterViewInit() {
    this.highestPoint = Math.max(
      ...this.monthProduction.map((e) => e.valueKwh)
    );
    this.buildChart();
  }

  buildChart() {
    const yAxis = Utilities.ChartAxis(
      Math.max(
        ...[...this.monthProduction, ...this.environmentProduction].map(
          (e) => e.valueKwh
        )
      )
    );
    const dates = DateUtil.MonthDates(this.monthProduction[0]?.time);
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
      colors: ['#039be5', '#f3a600', '#70c265', '#d30000', '#76E3E3'],
      series: [
        {
          name: '',
          type: 'column',
          data: dates.map(
            (d) =>
              this.monthProduction.find((e) => DateUtil.IsSameDay(e.time, d))
                ?.valueKwh || 0
          ),
        },
        {
          name: 'ממוצע אזורי',
          type: 'line',
          data: dates.map(
            (d) =>
              this.environmentProduction.find((e) =>
                DateUtil.IsSameDay(e.time, d)
              )?.valueKwh || 0
          ),
        },
        {
          name: 'סגירת תקלה',
          type: 'line',
          data: dates.map((d) =>
            this.malfunctionsEndDates.some((md) => DateUtil.IsSameDay(md, d))
              ? (this.highestPoint * 3) / 5
              : NaN
          ),
        },
        {
          name: 'פתיחת תקלה',
          type: 'line',
          data: dates.map((d) =>
            this.malfunctionsStartDates.some((md) => DateUtil.IsSameDay(md, d))
              ? (this.highestPoint * 2) / 5
              : NaN
          ),
        },
        {
          name: 'שטיפה',
          type: 'line',
          data: dates.map((d) =>
            this.washesDates.some((wd) => DateUtil.IsSameDay(wd, d))
              ? (this.highestPoint * 3) / 4
              : NaN
          ),
        },
      ],
      xaxis: {
        categories: dates.map((v) => formatDate(v, 'd', 'he')),
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        labels: {
          trim: true,
          rotate: 0,
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
          text: 'kWh',
          offsetX: -32,
        },
      },
      stroke: {
        width: [0, 2, 0, 0, 0],
      },
      markers: {
        size: [0, 0, 5, 5, 5],
      },
      plotOptions: {
        bar: {
          columnWidth: '70%',
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'start',
        markers: {
          offsetX: 5,
          fillColors: ['#ffffff', '#f3a600', '#70c265', '#d30000', '#76E3E3'],
          strokeWidth: 5,
          width: 15,
          height: [15, 7, 15, 15, 15],
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
