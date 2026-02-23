import { inject, Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';
import {
  BehaviorSubject,
  defer,
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  combineLatest,
  Observable,
  filter,
  tap,
} from 'rxjs';
import { MonitorFacade } from '../../../state/monitor/monitor.facade';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CoordinatorsService } from '../../people/services/coordinators.service';
import { FiltersService } from './filters.service';

@Injectable()
export class FiltersControlService {
  monitorFacade = inject(MonitorFacade);
  router = inject(Router);
  route = inject(ActivatedRoute);
  constructor(private readonly filtersService: FiltersService) {
    this.systemsControl.setValue(this.filtersService.systemsSelectionSnapshot, {
      emitEvent: false,
    });
    this.clientsControl.setValue(this.filtersService.clientsSelectionSnapshot, {
      emitEvent: false,
    });
  }

  kwpControl = new FormControl();
  kwpControlState = this.kwpControl.valueChanges.pipe(
    startWith(this.kwpControl.value),
    distinctUntilChanged(),
    debounceTime(100)
  );
  coordinatorsService = inject(CoordinatorsService);
  portalControl = new FormControl();
  portalControlState = this.portalControl.valueChanges.pipe(
    startWith(this.portalControl.value)
  );

  criteriaControl = new FormControl();
  criteriaControlState = this.criteriaControl.valueChanges.pipe(
    startWith(this.criteriaControl.value)
  );

  contracts = ['year', 'month', 'retrofit', 'manual'];
  contractsOptions = ['no_contract', ...this.contracts];
  contractsControl = new FormControl(this.contracts);
  contractsControlState = this.contractsControl.valueChanges.pipe(
    startWith(this.contractsControl.value)
  );

  activityControl: FormControl<string[] | null> = new FormControl([]);
  activityControlState: Observable<string[]> =
    this.activityControl.valueChanges.pipe(
      startWith([]),
      filter((data): data is string[] => Boolean(data))
    );

  systemsControl = new FormControl<any[]>([]);
  systemsControlState: Observable<any[]> = defer(() =>
    this.systemsControl.valueChanges.pipe(
      startWith(this.systemsControl.value || []),
      map((data) => data || []),
      tap((data) => this.filtersService.setSystemsSelection(data))
    )
  );
  systemsSearchControl = new FormControl();
  private readonly systemsResetLoadingSubject = new BehaviorSubject(false);
  readonly systemsResetLoading$ = this.systemsResetLoadingSubject.asObservable();

  clearSystemsSelectionWithDelay(delayMs = 600): void {
    if (this.systemsResetLoadingSubject.value) {
      return;
    }

    this.systemsResetLoadingSubject.next(true);
    setTimeout(() => {
      this.systemsControl.setValue([]);
      this.systemsResetLoadingSubject.next(false);
    }, delayMs);
  }
  systems = combineLatest([
    this.monitorFacade.fulltext,
    this.systemsSearchControl.valueChanges.pipe(startWith(null)),
    this.systemsControlState,
  ]).pipe(
    map(([data, search, selected]) => {
      let result;
      if (!search) {
        result = data;
      } else {
        const lowerSearch = search.toLowerCase();
        result = data.filter((item) =>
          item.system_name_idx.includes(lowerSearch)
        );
      }

      const selectedSet: Record<string, any> = {};
      selected.forEach((item: { id: string }) => {
        selectedSet[item.id] = true;
      });

      return result.filter((item) => !selectedSet[item.id]);
    })
  );

  systemsControlStateMap = this.systemsControlState.pipe(
    map((data) => {
      const result: Record<string, boolean> = {};
      data.forEach((item: any) => {
        result[item.id] = true;
      });
      return result;
    })
  );

  clientsControl = new FormControl<any[]>([]);
  clientsControlState: Observable<any[]> = defer(() =>
    this.clientsControl.valueChanges.pipe(
      startWith(this.clientsControl.value || []),
      map((data) => data || []),
      tap((data) => this.filtersService.setClientsSelection(data))
    )
  );
  clientsSearchControl = new FormControl();
  private readonly clientsResetLoadingSubject = new BehaviorSubject(false);
  readonly clientsResetLoading$ = this.clientsResetLoadingSubject.asObservable();

  clearClientsSelectionWithDelay(delayMs = 600): void {
    if (this.clientsResetLoadingSubject.value) {
      return;
    }

    this.clientsResetLoadingSubject.next(true);
    setTimeout(() => {
      this.clientsControl.setValue([]);
      this.clientsResetLoadingSubject.next(false);
    }, delayMs);
  }
  clients = combineLatest([
    this.coordinatorsService.allCustomersOfSelectedCoordinatorsMap.pipe(
      map((data) => Array.from(data.values()))
    ),
    this.clientsSearchControl.valueChanges.pipe(startWith(null)),
    this.clientsControlState,
  ]).pipe(
    map(([data, search, selected]) => {
      let result;
      if (!search) {
        result = data.filter((item) => item.clientName || item.name);
      } else {
        const lowerSearch = search.toLowerCase();
        result = data.filter((item) =>
          (item.clientName || item.name || '').includes(lowerSearch)
        );
      }

      const selectedSet: Record<string, any> = {};
      selected.forEach((item: { _id: string }) => {
        selectedSet[item._id] = true;
      });

      return result.filter((item) => !selectedSet[item._id]);
    })
  );
  clientsAll = combineLatest([
    this.monitorFacade.clientsAll,
    this.clientsSearchControl.valueChanges.pipe(startWith(null)),
    this.clientsControlState,
  ]).pipe(
    map(([data, search, selected]) => {
      let result;
      if (!search) {
        result = data;
      } else {
        const lowerSearch = search.toLowerCase();
        result = data.filter((item) => item.fulltext.includes(lowerSearch));
      }

      const selectedSet: Record<string, any> = {};
      selected.forEach((item: { id: string }) => {
        selectedSet[item.id] = true;
      });

      return result.filter((item) => !selectedSet[item.id]);
    })
  );

  clientsControlStateMap = this.clientsControlState.pipe(
    map((data) => {
      const result: Record<string, boolean> = {};
      data.forEach((item: any) => {
        result[item._id || item.id] = true;
      });
      return result;
    })
  );

  regionsControl = new FormControl();
  regionsControlState = this.regionsControl.valueChanges.pipe(
    startWith(this.regionsControl.value || [])
  );
  regionsSearchControl = new FormControl();
  regions = combineLatest([
    this.monitorFacade.regions,
    this.regionsSearchControl.valueChanges.pipe(startWith(null)),
    this.regionsControlState,
  ]).pipe(
    map(([data, search, selected]) => {
      let result;
      if (!search) {
        result = data;
      } else {
        const lowerSearch = search.toLowerCase();
        result = data.filter((item) => item.fulltext.includes(lowerSearch));
      }

      const selectedSet: Record<string, any> = {};
      selected.forEach((item: { name: string }) => {
        selectedSet[item.name] = true;
      });

      return result.filter((item) => !selectedSet[item.name]);
    })
  );
  regionsControlStateMap = this.regionsControlState.pipe(
    map((data) => {
      const result: Record<string, boolean> = {};
      data.forEach((item: any) => {
        result[item.name] = true;
      });
      return result;
    })
  );
}
