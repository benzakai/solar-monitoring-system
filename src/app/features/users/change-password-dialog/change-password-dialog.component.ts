import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '../../../core/lang/translate.pipe';
import { User } from '../../../domain/user';

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'users.dialog.change_password' | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <div class="form-line">
          <mat-form-field appearance="outline">
            <input matInput type="password" formControlName="password" />
          </mat-form-field>
          <label>{{ 'users.dialog.new_password' | translate }}</label>
        </div>
        <div class="form-line">
          <mat-form-field appearance="outline">
            <input matInput type="password" formControlName="confirmPassword" />
            @if (form.errors?.['passwordMismatch']) {
              <mat-error>{{
                'users.dialog.passwords_not_match' | translate
              }}</mat-error>
            }
          </mat-form-field>
          <mat-label>{{
            'users.dialog.confirm_password' | translate
          }}</mat-label>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>
        {{ 'users.dialog.cancel' | translate }}
      </button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="!form.valid"
        (click)="save()"
      >
        {{ 'users.dialog.save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 300px;
        padding: 16px 0;
      }

      mat-form-field {
        width: 100%;
      }
    `,
  ],
})
export class ChangePasswordDialogComponent {
  private dialogRef = inject(MatDialogRef<ChangePasswordDialogComponent>);
  private data: { user: User } = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  form: FormGroup = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: this.passwordMatchValidator,
    }
  );

  private passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  save() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value.password);
    }
  }
}
