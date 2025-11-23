import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, merge, of, startWith, switchMap, take } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  loadMonitorItemsSuccess,
  loadMonitorItemsFailure,
  loadMonitorItems,
} from './monitor.actions';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { DirectMonitorService } from '../../endpoint/direct-monitor.service';

@Injectable()
export class MonitorEffects {
  auth = inject(AngularFireAuth);
  authState = this.auth.authState.pipe(startWith(undefined));
  actions$ = inject(Actions);
  router = inject(Router);
  monitorItemService = inject(DirectMonitorService);

  loadMonitorItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMonitorItems),
      switchMap(() =>
        this.authState.pipe(
          filter((auth): auth is NonNullable<typeof auth> => Boolean(auth)),
          take(1),
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
      )
    )
  );
}
