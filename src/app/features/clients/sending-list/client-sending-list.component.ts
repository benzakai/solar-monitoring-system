import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { Person } from '../../../domain/person';
import { PeopleService } from '../../../endpoint/people.service';
import {
  firstValueFrom,
  BehaviorSubject,
  combineLatest,
  of,
  filter,
} from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '../../../core/lang/translate.pipe';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PersonInfoDialogComponent } from '../../system-settings/components/person-info-dialog/person-info-dialog.component';
import { ContactSelectionDialogComponent } from '../../system-settings/components/contact-selection-dialog/contact-selection-dialog.component';

@Component({
  selector: 'app-client-sending-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatTooltipModule,
    TranslatePipe,
    MatDialogModule,
  ],
  templateUrl: './client-sending-list.component.html',
})
export class ClientSendingListComponent {
  @Input() client!: Person;
  newEmail = '';
  private peopleService = inject(PeopleService);
  private dialog = inject(MatDialog);

  private list$ = new BehaviorSubject<string[]>([]);
  data$ = combineLatest([this.list$, of(null)]).pipe(
    switchMap(([list]) => {
      const ids = (list || []).filter((e) =>
        /^(?:[a-zA-Z0-9_-]{20,})$/.test(e)
      );
      if (!ids.length) {
        return of((list || []).map((raw) => ({ _raw: raw })));
      }
      return this.peopleService.getPeopleByIds(ids).pipe(
        map((people) => {
          const ppl = (people || []).filter((p) => p?.isActive);
          const byId = new Map(ppl.map((p) => [p._id, p]));
          return (list || [])
            .filter((id) => byId.has(id))
            .map((raw) => ({
              _raw: raw,
              ...(byId.get(raw) || {}),
            }));
        })
      );
    })
  );

  ngOnChanges() {
    this.list$.next(this.client?.sendingList || []);
  }

  addEmail() {
    const list = Array.from(
      new Set(
        [...(this.client.sendingList || []), this.newEmail].filter(Boolean)
      )
    );
    this.save(list);
    this.newEmail = '';
  }

  removeEmail(email: string) {
    const list = (this.client.sendingList || []).filter((e) => e !== email);
    this.save(list);
  }

  private async save(list: string[]) {
    this.client.sendingList = list;
    await firstValueFrom(
      this.peopleService.updatePerson(this.client._id, { sendingList: list })
    );
    this.list$.next(list);
  }

  editPerson(personId: string) {
    this.dialog.open(PersonInfoDialogComponent, {
      width: '500px',
      data: { personId },
    });
  }

  async addPersonViaDialog() {
    const ref = this.dialog.open(ContactSelectionDialogComponent, {
      width: '600px',
    });
    const selected = await ref.afterClosed().toPromise();
    if (selected?._id) {
      const list = Array.from(
        new Set(
          [...(this.client.sendingList || []), selected._id].filter(Boolean)
        )
      );
      this.save(list);
    }
  }
}
