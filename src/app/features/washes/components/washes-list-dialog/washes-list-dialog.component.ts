import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
import { WashesService } from '../../washes.service';

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
  displayedColumns: string[] = ['date', 'supplier', 'price', 'comment', 'nextWash', 'done', 'actions'];
  dataSrc = new MatTableDataSource<Wash>([]);
  public data = inject<{ washRow: WashRow }>(MAT_DIALOG_DATA);
  private washesService = inject(WashesService);

  constructor() {
    const washes = (this.data.washRow.systemWash?.washes || [])
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

  removeWash(wash: Wash): void {
    const systemId = this.data.washRow.id;
    this.washesService
      .deleteWash(systemId, (w: any) => this.isSameWash(wash, w))
      .subscribe({
        next: () => {
          this.dataSrc.data = this.dataSrc.data.filter((item) => !this.isSameWash(item, wash));
        },
      });
  }

  private isSameWash(localWash: Wash, storedWash: any): boolean {
    const localDate = this.parseDatesToSimple(localWash.date);
    const storedDate = this.parseDatesToSimple(storedWash?.date);

    const localNext = this.parseDatesToSimple(localWash.nextWash);
    const storedNext = this.parseDatesToSimple(storedWash?.nextWash);

    return (
      localDate === storedDate &&
      (localWash.supplier ?? '') === (storedWash?.supplier ?? '') &&
      Number(localWash.price ?? 0) === Number(storedWash?.price ?? 0) &&
      (localWash.comment ?? '') === (storedWash?.comment ?? '') &&
      localNext === storedNext
    );
  }
}


