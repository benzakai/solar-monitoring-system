import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '../../core/lang/translate.pipe';
import { PeopleService } from '../../endpoint/people.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-create-client-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './create-client-dialog.component.html',
  styleUrl: './create-client-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateClientDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly peopleService = inject(PeopleService);
  private readonly dialogRef = inject(
    MatDialogRef<CreateClientDialogComponent>
  );

  saving = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', Validators.email],
    phone: ['', Validators.required],
  });

  save() {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, email, phone } = this.form.getRawValue();
    this.saving = true;
    this.peopleService
      .addClient({
        clientName: name,
        email: email || '',
        phone: phone || '',
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (client) => this.dialogRef.close(client),
        error: () => this.dialogRef.close(),
      });
  }
}


