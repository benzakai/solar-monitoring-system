import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MalfunctionAction } from '../../../domain/malfunction';
import { PeopleFacade } from '../../../state/people/people.facade';
import { UsersFacade } from '../../../state/users/users.facade';
import { TranslatePipe } from '../../../core/lang/translate.pipe';

@Component({
  selector: 'app-logs-table',
  standalone: true,
  imports: [DatePipe, TranslatePipe],
  templateUrl: './logs-table.component.html',
  styleUrl: './logs-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogsTableComponent implements OnInit {
  usersFacade = inject(UsersFacade);
  changeDetectorRef = inject(ChangeDetectorRef);
  @Input() logs: MalfunctionAction[] = [];

  people: { [k in string]: string } = {};

  ngOnInit() {
    this.usersFacade
      .getUsersByIds(this.logs.map((log) => log.by))
      .subscribe((people) => {
        people.forEach((person) => {
          this.people[person.uid] = person.displayName;
        });
        this.changeDetectorRef.markForCheck();
      });
  }
}
