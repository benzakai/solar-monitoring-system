import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '../../../core/lang/translate.pipe';
import { User } from '../../../domain/user';
import { UserRole } from '../../../endpoint/users.service';

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>
      {{
        (data.user ? 'users.dialog.edit_user' : 'users.dialog.add_user')
          | translate
      }}
    </h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <div class="form-line">
          <mat-form-field class="inline-form" appearance="outline">
            <input matInput formControlName="displayName" required />
          </mat-form-field>
          <label>{{ 'users.table.name' | translate }}</label>
        </div>

        <div class="form-line">
          <mat-form-field class="inline-form" appearance="outline">
            <input matInput formControlName="email" required type="email" />
          </mat-form-field>
          <label>{{ 'users.table.email' | translate }}</label>
        </div>

        @if (!data?.user?.uid) {
          <div class="form-line">
            <mat-form-field class="inline-form" appearance="outline">
              <input
                matInput
                formControlName="password"
                required
                type="password"
              />
            </mat-form-field>
            <label>{{ 'users.dialog.new_password' | translate }}</label>
          </div>
        }

        <div class="form-line">
          <mat-form-field class="inline-form" appearance="outline">
            <mat-select formControlName="role" required>
              <mat-option *ngFor="let role of roles" [value]="role.value">
                {{ 'users.roles.' + role.name | translate }}
              </mat-option>
            </mat-select>
          </mat-form-field>
          <label>{{ 'users.table.role' | translate }}</label>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        {{ 'users.dialog.cancel' | translate }}
      </button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSave()"
        [disabled]="!form.valid"
      >
        {{ 'users.dialog.save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [],
})
export class UserDialogComponent {
  private dialogRef = inject(MatDialogRef<UserDialogComponent>);
  private fb = inject(FormBuilder);
  data: { user?: User } = inject(MAT_DIALOG_DATA);

  form: FormGroup;
  roles = [
    { name: 'admin', value: UserRole.ADMIN },
    { name: 'manager', value: UserRole.MANAGER },
    { name: 'accountancy', value: UserRole.ACCOUNTANCY },
    { name: 'tech', value: UserRole.TECH },
    { name: 'coordinator', value: UserRole.COORDINATOR },
    { name: 'simple', value: UserRole.SIMPLE },
  ];

  constructor() {
    this.form = this.fb.group({
      displayName: [this.data.user?.displayName || '', Validators.required],
      email: [
        this.data.user?.email || '',
        [Validators.required, Validators.email],
      ],
      password: [''],
      role: [this.data.user?.role || UserRole.SIMPLE, Validators.required],
    });

    if (!this.data.user?.uid) {
      this.form.get('password')?.setValidators([Validators.required]);
    } else {
      this.form.get('email')?.disable();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
