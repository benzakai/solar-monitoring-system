import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReportsService } from '../../../../endpoint/reports.serivce';
import { filter, map, Observable, of, retry, switchMap, tap } from 'rxjs';
import { createSystemReportData, SystemReportDoc } from './pre';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { SystemDashboardComponent } from '../components/system-dashboard/system-dashboard.component';
import { ReportMalfunctionTableComponent } from '../components/malfunction-table/report-malfunction-table.component';
import { MonthChartComponent } from '../components/month-chart/month-chart.component';
import { AnnualChartComponent } from '../components/annual-chart/annual-chart.component';
import { PageTemplateComponent } from '../components/page-template/page-template.component';
import { ReportFooterComponent } from '../components/report-footer/report-footer.component';
import { ReportHeaderComponent } from '../components/report-header/report-header.component';
import { SystemType } from '../../../systems/system-type';
import { EnergySample } from '../../../../domain/energy';
import { Malfunction } from '../../../../domain/malfunction';
import { ClientReportSystemsTableComponent } from '../components/client-report-systems-table/client-report-systems-table.component';

export interface SystemReportData {
  systemId: string;
  date: number;
  isAnnual: boolean;
  clientName: string;
  systemName: string;
  systemType: string;
  KWP: number;
  monthProduction?: EnergySample[];
  monthPrediction: number;
  totalMonth: number;
  totalMonthNorm: number;
  totalMonthLastYear: number;
  environmentMonthEnergy: EnergySample[];
  monthEnvironmentRatio: number;
  totalYear: number;
  totalLastYear?: number;
  multiAnnual: EnergySample[];
  multiAnnualMean: number;
  annualEnvironmentRatio?: number;
  monthProfit?: number;
  annualProfit: number;
  productionPerMonth: number[];
  productionPerMonthLastYear: number[];
  predictionPerMonth: number[];
  productionPredictionRatio: number;
  annualMalfunctions: Partial<Malfunction>[];
  malfunctions: Partial<Malfunction>[];
  malfunctionsStartDates: number[];
  malfunctionsEndDates: number[];
  washesDates: number[];
  comment: string;
}

@Component({
  selector: 'app-report-preview',
  standalone: true,
  imports: [
    AsyncPipe,
    DecimalPipe,
    AnnualChartComponent,
    SystemDashboardComponent,
    ReportMalfunctionTableComponent,
    MonthChartComponent,
    PageTemplateComponent,
    DatePipe,
    ReportFooterComponent,
    ReportHeaderComponent,
    ClientReportSystemsTableComponent,
  ],
  templateUrl: './report-preview.component.html',
  styleUrl: './report-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportPreviewComponent {
  router = inject(Router);
  reportService = inject(ReportsService);
  activatedRoute = inject(ActivatedRoute);
  title: string = 'דו"ח ניטור ';
  documents: (any | null)[] = [];
  clientName = '';

  reps: Observable<SystemReportData[]> = this.activatedRoute.params.pipe(
    map((params) => {
      const pageParam = params['id'];
      return pageParam;
    }),
    filter(Boolean),
    map((d) => d.split('_')),
    switchMap(([clientId, time, isAnnual]) =>
      this.reportService.getForClientAndTime(clientId, Number(time)).pipe(
        map((reports) =>
          reports
            .map((d) => createSystemReportData(d as any as SystemReportDoc))
            .sort((a, b) => a.systemName.localeCompare(b.systemName))
        ),
        tap((clientSystemsData) => {
          this.title += this.isAnnual ? 'שנתי' : 'חודשי';
          this.clientName = clientSystemsData[0].clientName;
        })
      )
    )
  );

  isAnnual = false;
  date = 1740787200000;
}
