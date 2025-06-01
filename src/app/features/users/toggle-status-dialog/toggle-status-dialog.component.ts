import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../../../core/lang/translate.pipe';
import { User } from '../../../domain/user';

@Component({
  selector: 'app-toggle-status-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    TranslatePipe
  ],
  template: `
    <h2 mat-dialog-title>{{ (data.user.isActive ? 'users.dialog.deactivate_user' : 'users.dialog.activate_user') | translate }}</h2>
    <mat-dialog-content>
      <p>{{ (data.user.isActive ? 'users.dialog.deactivate_confirmation' : 'users.dialog.activate_confirmation') | translate }} {{ data.user.displayName }}?</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'users.dialog.cancel' | translate }}</button>
      <button mat-flat-button 
              [color]="data.user.isActive ? 'warn' : 'primary'"
              (click)="confirm()">
        {{ (data.user.isActive ? 'users.dialog.deactivate' : 'users.dialog.activate') | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 300px;
      margin: 20px 0;
    }
  `]
})
export class ToggleStatusDialogComponent {
  dialogRef = inject(MatDialogRef<ToggleStatusDialogComponent>);
  data: { user: User } = inject(MAT_DIALOG_DATA);

  confirm() {
    this.dialogRef.close(true);
  }
} 