import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Wash } from '../../../../domain/system-wash';
import { WashRow } from '../../WashRow';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-washes-list-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogClose,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    DatePipe,
    DecimalPipe,
    TranslatePipe,
  ],
  templateUrl: './washes-list-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WashesListDialogComponent {
  displayedColumns: string[] = ['date', 'supplier', 'price', 'comment', 'nextWash', 'done'];
  dataSrc = new MatTableDataSource<Wash>([]);

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { washRow: WashRow }
  ) {
    const washes = (data.washRow.systemWash?.washes || [])
      .slice()
      .map((w) => ({
        ...w,
        date: this.parseDatesToSimple(w.date),
        nextWash: this.parseDatesToSimple((w as any).nextWash),
      }))
      .sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0));
    this.dataSrc.data = washes as Wash[];
  }

  private parseDatesToSimple(value: unknown): number | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (value instanceof Timestamp) return value.toMillis();
    return undefined;
  }

  isDone(wash: any): boolean {
    return Boolean(wash && (wash.done || wash.washDone));
  }
}


