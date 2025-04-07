import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { EMPTY } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import * as fromActions from './actions';
import { PeopleService } from './services/people.service';
import { EmailsService } from './services/emails.service';
import { ReportsService } from './services/reports.service';
import { MonitorFacade } from './facades/monitor.facade';

@Injectable()
export class ClientEffects {
  constructor(
    private actions$: Actions,
    private store: Store,
    private peopleService: PeopleService,
    private emailsService: EmailsService,
    private reportsService: ReportsService,
    private monitorFacade: MonitorFacade
  ) {}

  loadClients$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fromActions.loadClients),
      switchMap(() =>
        this.peopleService.getAllClients().pipe(
          map((clients) => fromActions.loadClientsSuccess({ clients })),
          catchError((error) => EMPTY) // Add error handling here
        )
      )
    )
  );

  loadSystemsForClients$ = createEffect(() =>
    this.monitorFacade.monitorItems.pipe(
      map((systems) => {
        const systemsMapByClientId = (systems || []).reduce(
          (acc, system) => {
            const clientId = system?.client?.id;
            const currentSystems = acc[clientId] || [];
            return Object.assign(acc, {
              [clientId]: [...currentSystems, system],
            });
          },
          {} as { [clientId: string]: any[] }
        );
        return fromActions.loadSystemsForClientsSuccess({
          systemsByClientId: systemsMapByClientId,
        });
      }),
      catchError(() => EMPTY)
    )
  );

  loadReports$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fromActions.loadReportsFromMonth),
      switchMap(({ year, month }) =>
        this.reportsService.getReportsFromMonth(year, month).pipe(
          map((reports) =>
            fromActions.loadReportsFromMonthSuccess({ reports })
          ),
          catchError(() => EMPTY)
        )
      )
    )
  );

  loadEmails$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fromActions.loadEmailsFromMonth),
      switchMap(({ year, month }) =>
        this.emailsService.getEmailsFromMonth(year, month).pipe(
          map((emails) =>
            fromActions.loadEmailsFromMonthSuccess({ emailsByClientId: emails })
          ),
          catchError(() => EMPTY)
        )
      )
    )
  );
}
