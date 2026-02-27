import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';

type EditLogDialogData = {
  text: string;
};

@Component({
  selector: 'app-edit-log-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatIcon,
    TranslatePipe,
  ],
  templateUrl: './edit-log-dialog.component.html',
  styleUrl: './edit-log-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditLogDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<EditLogDialogComponent>);
  data: EditLogDialogData = inject(MAT_DIALOG_DATA);

  form = this.fb.group({
    text: [this.data.text || '', [Validators.required]],
  });

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({ text: this.form.value.text?.trim() || '' });
  }
}
