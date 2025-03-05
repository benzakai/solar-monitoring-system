import { inject, Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { merge, of, startWith, switchMap } from 'rxjs';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { catchError, map } from 'rxjs/operators';
import { EnergyService } from '../../endpoint/energy.service';
import {
  loadEnergyItems,
  loadEnergyItemsFailure,
  loadEnergyItemsSuccess,
} from './energy.actions';

@Injectable()
export class EnergyEffects {
  auth = inject(AngularFireAuth);
  authState = this.auth.authState.pipe(startWith(undefined));
  energyService = inject(EnergyService);
  actions$ = inject(Actions);
  router = inject(Router);

  loadEnergyItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadEnergyItems),
      switchMap(() =>
        this.authState.pipe(
          switchMap(() =>
            merge(
              this.energyService.getAllSnapshot(),
              this.energyService.getAllChanged()
            ).pipe(
              map((energyItems) => loadEnergyItemsSuccess({ energyItems })),
              catchError((error) => {
                if (error.code === 'permission-denied') {
                  this.router.navigate(['/login']);
                }
                return of(loadEnergyItemsFailure({ error: error.message }));
              })
            )
          )
        )
      )
    )
  );
}
