import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, startWith, switchMap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import {
  loadSystemEnergyItem,
  loadSystemEnergyItemFailure,
  loadSystemEnergyItemSuccess,
} from './system-energy.actions';
import { EnergyService } from '../../endpoint/energy.service';

@Injectable()
export class SystemEnergyEffects {
  auth = inject(AngularFireAuth);
  authState = this.auth.authState.pipe(startWith(undefined));
  actions$ = inject(Actions);

  constructor(
    private router: Router,
    private energyService: EnergyService
  ) {}

  loadSystemEnergy$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSystemEnergyItem),
      switchMap(({ id }) =>
        this.authState.pipe(
          switchMap(() =>
            this.energyService.getEnergy(id).pipe(
              map((energy) => loadSystemEnergyItemSuccess({ energy })),
              catchError((error) => {
                if (error.code === 'permission-denied') {
                  this.router.navigate(['/login']);
                }
                return of(
                  loadSystemEnergyItemFailure({ error: error.message })
                );
              })
            )
          )
        )
      )
    )
  );
}
