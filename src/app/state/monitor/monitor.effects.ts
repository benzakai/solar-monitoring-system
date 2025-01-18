import { inject, Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { merge, of, startWith, switchMap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  loadMonitorItemsSuccess,
  loadMonitorItemsFailure,
} from './monitor.actions';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { DirectMonitorService } from '../../endpoint/direct-monitor.service';

@Injectable()
export class MonitorEffects {
  auth = inject(AngularFireAuth);
  authState = this.auth.authState.pipe(startWith(undefined));

  monitorItemService = inject(DirectMonitorService);
  constructor(
    private actions$: Actions,
    private router: Router
  ) {}

  loadMonitorItems$ = createEffect(() =>
    this.authState.pipe(
      switchMap(() =>
        merge(
          this.monitorItemService.getAllSnapshot(),
          this.monitorItemService.getAllChanged()
        ).pipe(
          map((monitorItems) => loadMonitorItemsSuccess({ monitorItems })),
          catchError((error) => {
            if (error.code === 'permission-denied') {
              this.router.navigate(['/login']);
            }
            return of(loadMonitorItemsFailure({ error: error.message }));
          })
        )
      )
    )
  );
}
