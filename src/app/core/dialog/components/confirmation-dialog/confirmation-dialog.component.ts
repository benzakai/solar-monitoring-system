import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../../../lang/translate.pipe';

export type ConfirmationDialogData = {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  displayCancel?: boolean;
};

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, TranslatePipe],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: ConfirmationDialogData,
    private dialogRef: MatDialogRef<ConfirmationDialogComponent>
  ) {}

  displayCancel() {
    return this.data.displayCancel === undefined
      ? true
      : this.data.displayCancel;
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
