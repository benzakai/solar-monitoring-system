import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { Malfunction } from '../../../../../domain/malfunction';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-report-malfunction-table',
  templateUrl: './report-malfunction-table.component.html',
  standalone: true,
  imports: [DatePipe],
  styleUrls: ['./report-malfunction-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportMalfunctionTableComponent implements OnInit {
  @Input() malfunctions: Partial<Malfunction>[] = [];

  constructor() {}

  ngOnInit() {}
}
