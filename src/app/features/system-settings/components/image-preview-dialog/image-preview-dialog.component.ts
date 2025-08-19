import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-image-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule],
  template: `
    <div class="dialog-container" (click)="close()">
      <button mat-icon-button class="close-btn" (click)="close($event)">
        <mat-icon>close</mat-icon>
      </button>
      <img [src]="data.url" alt="preview" (click)="$event.stopPropagation()" />
    </div>
  `,
  styles: [
    `
    .dialog-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
      padding: 0;
      margin: -24px; /* stretch to dialog edges */
      max-width: 90vw;
      max-height: 90vh;
      overflow: hidden;
    }
    img {
      max-width: 90vw;
      max-height: 90vh;
      object-fit: contain;
      user-select: none;
    }
    .close-btn {
      position: absolute;
      top: 66px;
      right: 66px;
      background: rgba(255,255,255,0.2);
      color: #fff;
    }
    `,
  ],
})
export class ImagePreviewDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ImagePreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { url: string }
  ) {}

  close(event?: Event) {
    if (event) event.stopPropagation();
    this.dialogRef.close();
  }
}



