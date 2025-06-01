import { inject, Injectable } from '@angular/core';
import {
  filter,
  first,
  map,
  of,
  pipe,
  share,
  shareReplay,
  switchMap,
  tap,
  combineLatest,
} from 'rxjs';
import { IdName } from '../../domain/id-name';
import { Store } from '@ngrx/store';
import { selectMonitorInited, selectMonitorItems } from './monitor.selectors';
import { MonitorItem } from '../../domain/monitor-item';
import { loadMonitorItems } from './monitor.actions';
import { CoordinatorsService } from '../../features/people/services/coordinators.service';
import { CurrentUserService } from '../../features/people/services/current-user.service';

@Injectable({
  providedIn: 'root',
})
export class MonitorFacade {
  store = inject(Store);

  coordinatorsService = inject(CoordinatorsService);
  currentUserService = inject(CurrentUserService);

  public monitorItems = this.store.select(selectMonitorInited).pipe(
    tap((inited) => {
      if (!inited) {
        this.store.dispatch(loadMonitorItems());
      }
    }),
    switchMap(() =>
      combineLatest([
        this.store.select(selectMonitorItems),
        this.coordinatorsService.allCustomersOfSelectedCoordinatorsMap.pipe(
          filter((map) => map.size > 0)
        ),
        this.coordinatorsService.coordinatorsShowAll,
      ]).pipe(
        map(([items, customers, showAll]) =>
          showAll
            ? items
            : items.filter(
                (item) => item?.client?.id && customers?.has(item.client.id)
              )
        )
      )
    ),
    share()
  );

  public monitorItemsAll = this.store.select(selectMonitorItems);

  public monitorItemsMap = this.monitorItems.pipe(
    map((items) => new Map(items.map((item) => [item.id, item]))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  public readonly monitor = this.monitorItems.pipe(
    filter((arr): arr is MonitorItem[] => Boolean(arr?.length > 0)),
    first()
  );

  public readonly monitorAll = this.monitorItemsAll.pipe(
    filter((arr): arr is MonitorItem[] => Boolean(arr?.length > 0)),
    first()
  );

  public readonly fulltext = this.monitor.pipe(
    map((data) =>
      data.map((item) => ({
        ...item,
        system_name_idx: item.system_name.toLowerCase(),
      }))
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  public readonly clients = this.monitor.pipe(
    map((data) => {
      const clients: Record<string, IdName> = {};
      data.forEach((item) => {
        if (item?.client?.id && item?.client?.name) {
          clients[item.client.id] = item.client;
        }
      });
      return Object.keys(clients).map((id) => ({
        ...clients[id],
        fulltext: clients[id].name.toLowerCase(),
      }));
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  public readonly clientsAll = this.monitorAll.pipe(
    map((data) => {
      const clients: Record<string, IdName> = {};
      data.forEach((item) => {
        if (item?.client?.id && item?.client?.name) {
          clients[item.client.id] = item.client;
        }
      });
      return Object.keys(clients).map((id) => ({
        ...clients[id],
        fulltext: clients[id].name.toLowerCase(),
      }));
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  public readonly regions = this.monitor.pipe(
    map((data) => {
      const regions: Record<
        string,
        {
          name: string;
          fulltext: string;
        }
      > = {};
      data.forEach((item) => {
        if (item.region?.length) {
          item.region.forEach((region) => {
            regions[region] = {
              name: region,
              fulltext: region.toLowerCase(),
            };
          });
        }
      });
      return Object.keys(regions).map((id) => regions[id]);
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  portals = this.monitor.pipe(
    map((data) => Array.from(new Set(data.map((item) => item.portal)))),
    shareReplay({ bufferSize: 1, refCount: true })
  );
}
