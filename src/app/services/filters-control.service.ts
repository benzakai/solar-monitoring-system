import { inject, Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  first,
  map,
  startWith,
  combineLatest,
  Observable,
  filter,
  pairwise,
} from 'rxjs';
import { MonitorFacade } from '../state/monitor/monitor.facade';

@Injectable()
export class FiltersControlService {
  monitorFacade = inject(MonitorFacade);

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

  systemsControl = new FormControl();
  systemsControlState = this.systemsControl.valueChanges.pipe(
    startWith(this.systemsControl.value || [])
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
  clients = combineLatest([
    this.monitorFacade.clients,
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
        result[item.id] = true;
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
    // this.contractsControl.valueChanges
    //   .pipe(startWith([]), pairwise())
    //   .subscribe(([p, n]) => {
    //     const prev = p || [];
    //     const next = n || [];
    //
    //     const prevAllSelected = this.contracts.every((contract) =>
    //       prev.includes(contract)
    //     );
    //     const nextAllSelected = this.contracts.every((contract) =>
    //       next.includes(contract)
    //     );
    //
    //     const prevSelector = prev.includes('all_contracts');
    //     const nextSelector = next.includes('all_contracts');
    //
    //     if (!prevAllSelected && nextAllSelected && !nextSelector) {
    //       this.contractsControl.setValue([...next, 'all_contracts']);
    //       return;
    //     }
    //
    //     if (prevAllSelected && !nextAllSelected && nextSelector) {
    //       this.contractsControl.setValue(
    //         next.filter((c) => c !== 'all_contracts')
    //       );
    //       return;
    //     }
    //
    //     if (!prevSelector && nextSelector) {
    //       const dest = [...new Set([...prev, ...this.contracts])];
    //       this.contractsControl.setValue(dest);
    //       return;
    //     }
    //   });
  }
}
