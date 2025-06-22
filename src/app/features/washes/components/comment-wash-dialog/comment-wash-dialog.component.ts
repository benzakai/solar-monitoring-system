import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { WashRow } from '../../WashRow';
import { WashesService } from '../../washes.service';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-comment-wash-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    TranslatePipe,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatIcon,
  ],
  templateUrl: './comment-wash-dialog.component.html',
  styleUrl: './comment-wash-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentWashDialogComponent implements OnInit {
  fb = inject(FormBuilder);
  washesService = inject(WashesService);
  dialogRef = inject(MatDialogRef<CommentWashDialogComponent>);
  data: { washRow: WashRow } = inject(MAT_DIALOG_DATA);

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      comment: [this.data.washRow.lastWash?.comment || ''],
    });
  }

  save() {
    if (this.form.invalid) {
      return;
    }

    const { comment } = this.form.getRawValue();

    this.washesService
      .updateWashComment(this.data.washRow.system.id, comment)
      .subscribe(() => {
        this.dialogRef.close();
      });
  }
}
