import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';

@Component({
  selector: 'app-report-coment',
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
    ReactiveFormsModule,
  ],
  templateUrl: './report-coment.component.html',
  styleUrl: './report-coment.component.css',
})
export class ReportComentComponent {
  dialogRef = inject<MatDialogRef<ReportComentComponent>>(MatDialogRef);
  data: { name: string; comment: string } = inject(MAT_DIALOG_DATA);
  comment = new FormControl(this.data?.comment || '');

  save() {
    this.dialogRef.close(this.comment.value);
  }
}
