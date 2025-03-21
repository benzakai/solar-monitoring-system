import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Inject,
  inject,
  ViewChild,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { AsyncPipe, DatePipe, DecimalPipe, NgForOf } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatFooterCell,
  MatFooterRow,
  MatFooterRowDef,
  MatHeaderCell,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
  MatTableModule,
} from '@angular/material/table';
import { SystemsService } from '../../../../endpoint/systems.service';
import { PeopleService } from '../../../../endpoint/people.service';
import {
  BehaviorSubject,
  filter,
  map,
  shareReplay,
  switchMap,
  take,
  combineLatest,
} from 'rxjs';

@Component({
  selector: 'app-system-comment-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    TranslatePipe,
    MatFormFieldModule,
    MatInputModule,
    MatIcon,
    MatDatepickerModule,
    ReactiveFormsModule,
    MatOption,
    MatSelect,
    NgForOf,
    MatProgressSpinnerModule,
    DatePipe,
    DecimalPipe,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatFooterCell,
    MatFooterRow,
    MatFooterRowDef,
    MatHeaderCell,
    MatHeaderRow,
    MatHeaderRowDef,
    MatTableModule,
    MatRow,
    MatRowDef,
    MatTable,
    AsyncPipe,
  ],
  templateUrl: './system-comment-dialog.component.html',
  styleUrl: './system-comment-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemCommentDialogComponent {
  updating = new BehaviorSubject(false);
  deleting = new BehaviorSubject(false);
  action = combineLatest([this.updating, this.deleting]).pipe(
    map(([a, b]) => a || b)
  );
  displayedColumns: string[] = ['name', 'position', 'phone', 'email'];
  systemsService = inject(SystemsService);
  peopleService = inject(PeopleService);
  dialogRef = inject<MatDialogRef<SystemCommentDialogComponent>>(MatDialogRef);
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

  comment = new FormControl('');

  constructor() {
    this.system.pipe(take(1)).subscribe((system) => {
      this.comment.setValue(system?.comments || '');
    });
  }

  delete() {
    this.deleting.next(true);
    this.update(null);
  }

  save() {
    this.updating.next(true);
    this.update(this.comment.value);
  }

  private update(val: string | null) {
    this.systemsService.updateComment(this.data.id, val).subscribe(() => {
      this.dialogRef.close({ comment: val });
    });
  }
}
