import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatRow,
  MatRowDef,
  MatTable,
} from '@angular/material/table';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe } from '../../../core/lang/translate.pipe';
import { filter, shareReplay, switchMap } from 'rxjs';
import { SystemsService } from '../../../endpoint/systems.service';
import { PeopleService } from '../../../endpoint/people.service';

@Component({
  selector: 'app-malfunction-people',
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    MatButton,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatProgressSpinner,
    MatRow,
    MatRowDef,
    MatTable,
    TranslatePipe,
  ],
  templateUrl: './malfunction-people.component.html',
  styleUrl: './malfunction-people.component.css',
})
export class MalfunctionPeopleComponent {
  displayedColumns: string[] = ['name', 'position', 'phone', 'email'];
  systemsService = inject(SystemsService);
  peopleService = inject(PeopleService);
  data: { id: string } = inject(MAT_DIALOG_DATA);
  system = this.systemsService.getById(this.data.id);

  people = this.system.pipe(
    filter(Boolean),
    switchMap((system) =>
      this.peopleService.getPeopleByIds(
        [system.client?.id, ...system.contactsIds].filter(
          (id): id is string => !!id
        )
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );
}
