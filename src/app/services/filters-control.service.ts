import {inject, Injectable} from '@angular/core';
import {FormControl} from '@angular/forms';
import {debounceTime, distinctUntilChanged, first, map, startWith, combineLatest} from 'rxjs';
import {DirectMonitorService} from './direct-monitor.service';

@Injectable()
export class FiltersControlService {

  directMonitorService = inject(DirectMonitorService);

  kwpControl = new FormControl();
  kwpControlState = this.kwpControl.valueChanges.pipe(
    startWith(this.kwpControl.value),
    distinctUntilChanged(),
    debounceTime(100),
  );

  portalControl = new FormControl();
  portalControlState = this.portalControl.valueChanges.pipe(
    startWith(this.portalControl.value),
  );

  activityControl = new FormControl(['Active', 'Inactive']);
  activityControlState = this.activityControl.valueChanges.pipe(
    startWith(['Active', 'Inactive']),
    map((value) => (value || []).map((item: string) => item === 'Active')),
  );

  systemsControl = new FormControl();
  systemsControlState = this.systemsControl.valueChanges.pipe(
    startWith(this.systemsControl.value || []),
  );
  systemsSearchControl = new FormControl();
  systems = combineLatest([
    this.directMonitorService.fulltext,
    this.systemsSearchControl.valueChanges.pipe(startWith(null)),
    this.systemsControlState,
  ]).pipe(
    map(([data, search, selected]) => {
      let result;
      if (!search) {
        result = data;
      } else {
        const lowerSearch = search.toLowerCase();
        result = data.filter((item) => item.system_name_idx.includes(lowerSearch));
      }

      const selectedSet: Record<string, any> = {};
      selected.forEach((item: {id: string}) => {
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
    }
  ));


  clientsControl = new FormControl();
  clientsControlState = this.clientsControl.valueChanges.pipe(
    startWith(this.clientsControl.value || []),
  );
  clientsSearchControl = new FormControl();
  clients = combineLatest([
    this.directMonitorService.clients,
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
      selected.forEach((item: {id: string}) => {
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
      }
    ));

  constructor() {
    this.directMonitorService.portals
      .pipe(first())
      .subscribe((portals) => {
        this.portalControl.setValue(portals);
      });
  }

}
