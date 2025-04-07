import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-systems-pie-chart',
  templateUrl: './systems-pie-chart.component.html',
  standalone: true,
  styleUrls: ['./systems-pie-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemsPieChartComponent
  implements AfterViewInit, AfterViewChecked
{
  chart?: ApexCharts;

  @ViewChild('chartDiv') chartDiv!: ElementRef<HTMLDivElement>;

  @Input() systems: any[] = [];

  constructor() {}

  ngAfterViewInit() {
    this.buildChart();
  }

  async buildChart() {
    const options = {
      chart: {
        type: 'donut',
        height: 250,
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
      series: this.systems.map((s) => s.monthProfit),
      labels: this.systems.map((s) => s.systemName),
      dataLabels: {
        enabled: true,
      },
      legend: {
        markers: {
          strokeWidth: 5,
          width: 15,
          height: 15,
          offsetY: 4,
        },
      },
      tooltip: {
        enabled: false,
      },
    };
    this.chart = new ApexCharts(this.chartDiv!.nativeElement, options);
    await this.chart.render();
  }

  ngAfterViewChecked() {
    document
      .querySelector('.apexcharts-legend')
      ?.setAttribute('style', 'overflow: visible');
  }
}
