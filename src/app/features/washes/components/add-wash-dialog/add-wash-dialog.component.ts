import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogContent,
  MatDialogActions,
  MatDialogTitle,
  MatDialogClose,
  MatDialogRef,
} from '@angular/material/dialog';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerModule,
  MatDatepickerToggle,
} from '@angular/material/datepicker';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { WashesService } from '../../washes.service';
import { WashRow } from '../../WashRow';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-add-wash-dialog',
  standalone: true,
  imports: [
    MatDialogContent,
    TranslatePipe,
    MatFormField,
    MatInput,
    MatLabel,
    MatDatepicker,
    MatDatepickerToggle,
    MatDatepickerInput,
    MatDialogActions,
    MatButton,
    MatDialogTitle,
    MatDialogClose,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatInputModule,
    MatError,
    MatIcon,
    MatIconButton,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './add-wash-dialog.component.html',
  styleUrl: './add-wash-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddWashDialogComponent implements OnInit {
  fb = inject(FormBuilder);
  washesService = inject(WashesService);
  dialogRef = inject(MatDialogRef<AddWashDialogComponent>);
  data: { washRow: WashRow } = inject(MAT_DIALOG_DATA);

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      date: [new Date(), Validators.required],
      supplier: ['', Validators.required],
      price: [null, [Validators.required, Validators.min(0)]],
    });
  }

  save() {
    if (this.form.invalid) {
      return;
    }

    const { date, supplier, price } = this.form.getRawValue();

    const dateA = new Date(date);
    const utcDate = Date.UTC(
      dateA.getFullYear(),
      dateA.getMonth(),
      dateA.getDate()
    );

    this.washesService
      .addWash(this.data.washRow.system.id, {
        date: utcDate,
        supplier,
        price,
      })
      .subscribe(() => {
        this.dialogRef.close();
      });
  }
}
