import { inject, Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  combineLatest,
  Observable,
  filter,
  defer,
} from 'rxjs';
import { MonitorFacade } from '../../../state/monitor/monitor.facade';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CoordinatorsService } from '../../people/services/coordinators.service';

@Injectable()
export class MalfunctionsFiltersControlService {
  monitorFacade = inject(MonitorFacade);
  coordinatorsService = inject(CoordinatorsService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  kwpControl = new FormControl();
  kwpControlState = this.kwpControl.valueChanges.pipe(
    startWith(this.kwpControl.value),
    distinctUntilChanged(),
    debounceTime(100)
  );

  portalControl = new FormControl();
  portalControlState = this.portalControl.valueChanges.pipe(
    startWith(this.portalControl.value)
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

  systemsControl = new FormControl([] as any[]);
  systemsControlState = defer(() =>
    this.systemsControl.valueChanges.pipe(
      startWith(this.systemsControl.value || []),
      map((value) => value || [])
    )
  );
  systemsSearchControl = new FormControl();
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

  clientsControl = new FormControl();
  clientsControlState = this.clientsControl.valueChanges.pipe(
    startWith(this.clientsControl.value || [])
  );
  clientsSearchControl = new FormControl();
  clientsForMalfunctions = this.coordinatorsService.allClientsOfSelectedCoordinatorsMap.pipe(
    map((clientsMap) =>
      Array.from(clientsMap.values()).map((client: any) => {
        const name = client?.clientName || client?.name || '';
        return {
          ...client,
          id: client?._id || client?.id,
          name,
          fulltext: name.toLowerCase(),
        };
      })
    )
  );
  clients = combineLatest([
    this.clientsForMalfunctions,
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
      selected.forEach((item: { _id?: string; id?: string }) => {
        selectedSet[item._id || item.id || ''] = true;
      });

      return result.filter(
        (item) => !selectedSet[item._id || item.id || '']
      );
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

  constructor() {
    this.systemsControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { sys: (value || []).map((v: any) => v?.id) },
          queryParamsHandling: 'merge',
        });
      });

    combineLatest([
      this.route.queryParams.pipe(startWith(this.route.snapshot.queryParams)),
      this.monitorFacade.monitorItemsMap,
    ])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, systems]) => {
        const v = params['sys'] || [];
        const urlValue = Array.isArray(v) ? v : [v];
        const controlValue = (this.systemsControl.value || []).map(
          (v: any) => v?.id
        );

        const strUrl = urlValue.sort().join(',');
        const strVal = controlValue.sort().join(',');

        if (strUrl !== strVal) {
          const res = urlValue.map((id: string) => systems.get(id));
          this.systemsControl.setValue(res, { emitEvent: true });
        }
      });

    this.clientsControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        const ids = (value || [])
          .map((client: any) => client?._id || client?.id)
          .filter(Boolean);
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { clients: ids.length ? ids : null },
          queryParamsHandling: 'merge',
        });
      });

    combineLatest([
      this.route.queryParams.pipe(startWith(this.route.snapshot.queryParams)),
      this.clientsForMalfunctions,
    ])
      .pipe(takeUntilDestroyed())
      .subscribe(([params, clients]) => {
        if (!clients?.length) {
          return;
        }
        const v = params['clients'] || [];
        const urlValue = Array.isArray(v) ? v : [v];
        const controlValue = (this.clientsControl.value || []).map(
          (client: any) => client?._id || client?.id
        );
        const strUrl = urlValue.sort().join(',');
        const strVal = controlValue.sort().join(',');
        if (strUrl !== strVal) {
          const clientsMap = clients.reduce(
            (acc, client) => acc.set(client.id, client),
            new Map<string, any>()
          );
          const selected = urlValue
            .map((id: string) => clientsMap.get(id))
            .filter(Boolean);
          this.clientsControl.setValue(selected, { emitEvent: false });
        }
      });
  }
}
