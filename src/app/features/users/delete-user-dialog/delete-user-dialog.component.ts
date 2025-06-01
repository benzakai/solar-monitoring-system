import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../../../core/lang/translate.pipe';
import { User } from '../../../domain/user';

@Component({
  selector: 'app-delete-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'users.dialog.delete_user' | translate }}</h2>
    <mat-dialog-content>
      <p>{{ 'users.dialog.delete_confirmation' | translate }} {{ data.user.displayName }}?</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">{{ 'users.dialog.cancel' | translate }}</button>
      <button mat-raised-button color="warn" (click)="onDelete()">
        {{ 'users.dialog.delete' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 300px;
    }
  `]
})
export class DeleteUserDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<DeleteUserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: User }
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onDelete(): void {
    this.dialogRef.close(true);
  }
} 