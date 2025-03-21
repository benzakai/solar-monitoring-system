import { Injectable } from '@angular/core';
import { DialogService } from '../../../core/dialog/services/dialog.service';
import { MalfunctionsService } from '../../../endpoint/malfunctions.service';
import { Malfunction } from '../../../domain/malfunction';
import { filter, map, Observable, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TranslatePipe } from '../../../core/lang/translate.pipe';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { MalfunctionCloseDialogComponent } from '../malfunction-close-dialog/malfunction-close-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class MalfunctionActionsService {
  constructor(
    private dialogService: DialogService,
    private malfunctionsService: MalfunctionsService,
    private afs: AngularFirestore,
    private translatePipe: TranslatePipe,
    private dialog: MatDialog
  ) {}

  public getMalfunction(id: string): Observable<Malfunction> {
    return this.afs
      .collection('malfunctions')
      .doc<Malfunction>(id)
      .valueChanges()
      .pipe(filter(Boolean));
  }

  public patchMalfunction(patch: Partial<Malfunction>): void {}

  public deleteMalfunction(
    malfunction: Pick<Malfunction, 'id'>
  ): Observable<boolean> {
    return this.dialogService
      .confirm({
        confirmText: this.translatePipe.transform(
          'malfunction.dialogDelete.confirm'
        ),
        cancelText: this.translatePipe.transform(
          'malfunction.dialogDelete.cancel'
        ),
        message: this.translatePipe.transform(
          'malfunction.dialogDelete.question'
        ),
        title: this.translatePipe.transform(
          'malfunction.dialogDelete.deletion'
        ),
      })
      .pipe(
        switchMap((result) =>
          result
            ? this.malfunctionsService.deleteMalfunction(malfunction.id).pipe(
                catchError(() => of(false)),
                map(() => true)
              )
            : of(false)
        )
      );
  }

  public closeMalfunction(
    malfunction: Pick<Malfunction, 'id'>
  ): Observable<Date | false> {
    return this.dialog
      .open(MalfunctionCloseDialogComponent, {
        data: {
          malfunction,
        },
      })
      .afterClosed();
  }
}
