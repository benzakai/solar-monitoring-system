import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslatePipe } from '../../../core/lang/translate.pipe';

@Component({
  selector: 'app-severity-icon',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './severity-icon.component.html',
  styleUrl: './severity-icon.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeverityIconComponent {
  @Input() value: number | undefined;
}
