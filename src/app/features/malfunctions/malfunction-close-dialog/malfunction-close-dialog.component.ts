import { Component, Inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { TranslatePipe } from '../../../core/lang/translate.pipe';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Malfunction } from '../../../domain/malfunction';
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerToggle,
} from '@angular/material/datepicker';
import { MatFormField, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { provideNativeDateAdapter } from '@angular/material/core';
import { DATE_FORMATS } from '../../monitoring/components/create-alert-dialog/create-alert-dialog.component';

@Component({
  selector: 'app-malfunction-close-dialog',
  standalone: true,
  imports: [
    MatButton,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    TranslatePipe,
    ReactiveFormsModule,
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatFormField,
    MatInput,
    MatSuffix,
  ],
  providers: [provideNativeDateAdapter(DATE_FORMATS)],
  templateUrl: './malfunction-close-dialog.component.html',
  styleUrl: './malfunction-close-dialog.component.css',
})
export class MalfunctionCloseDialogComponent {
  ctrl = new FormControl(new Date());

  constructor(
    @Inject(MAT_DIALOG_DATA) public malfunction: Malfunction,
    private dialogRef: MatDialogRef<MalfunctionCloseDialogComponent>
  ) {}
  onConfirm(): void {
    this.dialogRef.close(this.ctrl);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
