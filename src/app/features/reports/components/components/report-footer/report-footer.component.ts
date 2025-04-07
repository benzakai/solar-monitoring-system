import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-report-footer',
  templateUrl: './report-footer.component.html',
  styleUrls: ['./report-footer.component.scss'],
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportFooterComponent implements OnInit {
  @Input() comment: string = '';

  constructor() {}

  ngOnInit() {}
}
