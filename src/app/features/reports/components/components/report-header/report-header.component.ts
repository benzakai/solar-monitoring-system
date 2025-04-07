import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-report-header',
  templateUrl: './report-header.component.html',
  styleUrls: ['./report-header.component.scss'],
  imports: [DatePipe],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportHeaderComponent implements OnInit {
  @Input() date: number = Date.now();

  @Input() isAnnual: boolean = false;

  @Input() title: string = '';

  @Input() client: string = '';

  dateFormat: string = '';

  constructor() {}

  ngOnInit() {
    this.dateFormat = this.isAnnual ? 'yyyy' : 'MMMM yyyy';
  }
}
