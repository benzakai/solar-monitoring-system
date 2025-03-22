import { inject, Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import {
  debounceTime,
  filter,
  merge,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { catchError, map } from 'rxjs/operators';
import { MalfunctionsService } from '../../endpoint/malfunctions.service';
import {
  loadAllMalfunctions,
  loadMalfunctionsFailure,
  loadMalfunctionsSuccess,
  setClosedLoadingStatus,
} from './malfunctions.actions';
import { Store } from '@ngrx/store';
import { selectMalfunctionsStatuses } from './malfunctions.selectors';

@Injectable()
export class MalfunctionsEffects {
  auth = inject(AngularFireAuth);
  authState = this.auth.authState.pipe(startWith(undefined));
  malfunctionsService = inject(MalfunctionsService);
  actions$ = inject(Actions);
  router = inject(Router);
  store = inject(Store);

  authCheck = this.authState;

  loadForStatuses = createEffect(() =>
    this.authState.pipe(
      filter(Boolean),
      switchMap((s) =>
        this.store.select(selectMalfunctionsStatuses).pipe(
          filter((statuses) => statuses.length > 0),
          debounceTime(500),
          switchMap((statuses) => {
            if (statuses.includes('closed')) {
              this.store.dispatch(
                setClosedLoadingStatus({ status: 'LOADING' })
              );
            }
            return merge(
              this.malfunctionsService.getAllSnapshot(statuses).pipe(
                tap(() => {
                  if (statuses.includes('closed')) {
                    this.store.dispatch(
                      setClosedLoadingStatus({ status: 'LOADED' })
                    );
                  }
                })
              ),
              this.malfunctionsService.getAllChanged(statuses)
            ).pipe(
              map((items) => loadMalfunctionsSuccess({ items })),
              catchError(this.permissions)
            );
          })
        )
      )
    )
  );

  private permissions = (error: { code: string; message: string }) => {
    if (error.code === 'permission-denied') {
      this.router.navigate(['/login']);
    }
    return of(loadMalfunctionsFailure({ error: error.message }));
  };
}
