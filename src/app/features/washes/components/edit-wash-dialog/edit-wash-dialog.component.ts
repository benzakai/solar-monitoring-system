import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { WashesService } from '../../washes.service';
import { WashRow } from '../../WashRow';
import { provideNativeDateAdapter } from '@angular/material/core';
import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Wash } from '../../../../domain/system-wash';

@Component({
  selector: 'app-edit-wash-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    TranslatePipe,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    ReactiveFormsModule,
    AsyncPipe,
    MatIconModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './edit-wash-dialog.component.html',
  styleUrl: './edit-wash-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditWashDialogComponent implements OnInit {
  fb = inject(FormBuilder);
  washesService = inject(WashesService);
  dialogRef = inject(MatDialogRef<EditWashDialogComponent>);
  data: { washRow: WashRow } = inject(MAT_DIALOG_DATA);

  form!: FormGroup;

  ngOnInit(): void {
    const lastWash: Wash | undefined = this.data.washRow.lastWash;
    const { lastWashDate, nextWash } = this.data.washRow;
    this.form = this.fb.group({
      date: [lastWashDate ? new Date(lastWashDate) : null],
      nextWash: [nextWash ? new Date(nextWash) : null],
      supplier: [lastWash?.supplier || ''],
      price: [lastWash?.price || null],
    });
  }

  save() {
    if (this.form.invalid) {
      return;
    }

    const { date, nextWash, supplier, price } = this.form.getRawValue();

    const dateA = new Date(date);
    const utcDate = Date.UTC(
      dateA.getFullYear(),
      dateA.getMonth(),
      dateA.getDate()
    );

    const dateB = nextWash ? new Date(nextWash) : null;
    const utcNext = dateB
      ? Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate())
      : null;

    const updatedWash = {
      ...this.data.washRow.lastWash,
      date: utcDate,
      nextWash: utcNext,
      supplier,
      price,
    };

    this.washesService
      .updateWash(this.data.washRow.system.id, updatedWash)
      .subscribe(() => {
        this.dialogRef.close();
      });
  }
}
