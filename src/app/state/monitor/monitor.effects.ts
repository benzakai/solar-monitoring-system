import { inject, Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  loadMonitorItemsSuccess,
  loadMonitorItemsFailure,
} from './monitor.actions';
import { DirectMonitorService } from '../../services/direct-monitor.service';

@Injectable()
export class MonitorEffects {
  monitorItemService = inject(DirectMonitorService);
  constructor(private actions$: Actions) {}

  loadMonitorItems$ = createEffect(() =>
    this.monitorItemService.getAllSnapshot().pipe(
      map((monitorItems) => loadMonitorItemsSuccess({ monitorItems })),
      catchError((error) =>
        of(loadMonitorItemsFailure({ error: error.message }))
      )
    )
  );
}
