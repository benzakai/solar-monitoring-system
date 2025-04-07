import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-client-report-systems-table',
  templateUrl: './client-report-systems-table.component.html',
  styleUrls: ['./client-report-systems-table.component.scss'],
  imports: [DecimalPipe, CommonModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientReportSystemsTableComponent implements OnInit {
  @Input() systemsData: any[] = [];

  @Input() isAnnual: boolean = false;

  constructor() {}

  ngOnInit() {}

  sum(field: keyof any, conditionField?: keyof any) {
    return this.systemsData
      .filter((s) => !conditionField || !!s[conditionField])
      .map((s) => {
        const value = s[field];
        return Array.isArray(value) ? value.length : value;
      })
      .reduce(
        (p, c) => (typeof p === 'number' && typeof c === 'number' ? p + c : 0),
        0
      );
  }
}
