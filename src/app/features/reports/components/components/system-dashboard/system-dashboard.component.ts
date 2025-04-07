import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import {
  CommonModule,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from '@angular/common';

interface DashboardProps {
  // The datum label (can be affected by the date)
  label: (date: number) => string;
  // The datum value from the report data
  value: (data: any) => number;
  // How to display the value (convert to some string)
  displayValue: (value: number) => string;
  // Whether there is not sufficient data
  noData?: (data: any) => boolean;
  // Whether to show an arrow near the value
  withArrow?: boolean;
  // A separated line
  lineSection?: boolean;
}

interface DashboardView {
  label: string;
  displayValue: string;
  withArrow: boolean;
  arrowClass?: string;
  noData?: boolean;
  lineSection?: boolean;
}

@Component({
  selector: 'app-system-dashboard',
  templateUrl: './system-dashboard.component.html',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./system-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemDashboardComponent implements OnInit {
  @Input() systemData!: any;

  @Input() date: number = NaN;

  @Input() isAnnual: boolean = false;

  dashboardView: DashboardView[] = [];

  cssColumnsTemplate: string = '';

  private dashboardSet: DashboardProps[] = [];

  private formatDate(value: number, format: string) {
    return formatDate(value, format, 'he');
  }

  private formatNumber(value: number, format: string = '1.0-0') {
    return formatNumber(value, 'he', format);
  }

  private formatPercent(value: number, format: string = '1.0-0') {
    const ratio = Math.abs(value - 1);
    return formatPercent(ratio, 'he', format);
  }

  private formatCurrency(value: number) {
    return formatCurrency(value, 'he', '₪', 'ILS', '1.0-0');
  }

  constructor() {}

  ngOnInit() {
    if (this.isAnnual) {
      this.annualSet();
    } else {
      this.monthlySet();
    }
    this.setView();
  }

  private monthlySet() {
    this.dashboardSet = [
      {
        label: (d) => this.formatDate(d, 'MMMM yyyy') + ' (kWh)',
        value: (data) => data.totalMonth,
        displayValue: this.formatNumber,
      },
      {
        label: () => 'הכנסה כספית החודש',
        value: (data) => data.monthProfit || NaN,
        displayValue: this.formatCurrency,
      },
      {
        label: () => 'ביחס לחודש מקביל אשתקד',
        value: (data) => {
          const lastMonth = data.totalMonthLastYear;
          return data.totalMonth / lastMonth || 0;
        },
        displayValue: this.formatPercent,
        withArrow: true,
        noData: (data) => !data.totalMonthLastYear,
      },
      {
        label: () => 'ביחס לסביבה',
        value: (data) => data.monthEnvironmentRatio,
        displayValue: this.formatPercent,
        withArrow: true,
        noData: (data) => !data.environmentMonthEnergy.length,
        lineSection: true,
      },
      {
        label: (d) => `מצטבר ${this.formatDate(d, 'yyyy')} (kWh)`,
        value: (data) => data.totalYear,
        displayValue: this.formatNumber,
      },
      {
        label: () => 'הכנסה כספית מתחילת השנה',
        value: (data) => data.annualProfit,
        displayValue: this.formatCurrency,
      },
      {
        label: (d) => `kWh/kWp ${this.formatDate(d, 'yyyy')}`,
        value: (data) => data.totalYear / data.KWP,
        displayValue: this.formatNumber,
      },
    ];
  }

  private annualSet() {
    this.dashboardSet = [
      {
        label: (d) => this.formatDate(d, 'yyyy') + ' (kWh)',
        value: (data) => data.totalYear,
        displayValue: this.formatNumber,
      },
      {
        label: (d) => `kWh/kWp ${this.formatDate(d, 'yyyy')}`,
        value: (data) => data.totalYear / data.KWP,
        displayValue: this.formatNumber,
      },
      {
        label: () => 'הכנסה כספית',
        value: (data) => data.annualProfit,
        displayValue: this.formatCurrency,
        lineSection: true,
      },
      {
        label: (d) => {
          const date = new Date(d);
          date.setFullYear(date.getFullYear() - 1);
          return `ביחס ל-${this.formatDate(+date, 'yyyy')}`;
        },
        value: (data) => data.totalYear / (data.totalLastYear || NaN),
        displayValue: this.formatPercent,
        noData: (data) => !data.totalLastYear,
        withArrow: true,
      },
      {
        label: () => 'ביחס לסביבה',
        value: (data) => data.annualEnvironmentRatio || NaN,
        displayValue: this.formatPercent,
        noData: (data) => !data.annualEnvironmentRatio,
        withArrow: true,
      },
      {
        label: () => 'ביחס לממוצע רב שנתי',
        value: (data) => data.totalYear / data.multiAnnualMean,
        displayValue: this.formatPercent,
        withArrow: true,
        noData: (data) => !data.multiAnnualMean,
      },
      {
        label: () => 'ביחס לצפי',
        value: (data) => data.productionPredictionRatio,
        displayValue: this.formatPercent,
        withArrow: true,
      },
    ];
  }

  // Set the dashboard values according to the settings functions
  private setView() {
    this.dashboardView = this.dashboardSet.map((ds) => {
      const value = ds.value(this.systemData);
      return {
        displayValue: ds.displayValue(value),
        label: ds.label(this.date),
        withArrow: !!ds.withArrow,
        arrowClass: ds.withArrow ? this.arrowClass(value) : '',
        noData: ds.noData?.(this.systemData),
        lineSection: ds.lineSection,
      };
    });
    this.cssColumnsTemplate = `repeat(${this.dashboardView.length}, 1fr)`;
  }

  // Show up/down arrow according to the ratio value
  arrowClass(value: number): string {
    if (value > 1) {
      return 'up';
    }
    if (value < 1) {
      return 'down';
    }
    return '';
  }
}
