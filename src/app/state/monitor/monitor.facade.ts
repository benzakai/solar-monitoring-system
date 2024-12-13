import { inject, Injectable } from '@angular/core';
import { filter, first, map, shareReplay } from 'rxjs';
import { IdName } from '../../domain/id-name';
import { Store } from '@ngrx/store';
import { selectMonitorItems } from './monitor.selectors';
import { MonitorItem } from '../../domain/monitor-item';

@Injectable({
  providedIn: 'root',
})
export class MonitorFacade {
  store = inject(Store);

  public readonly monitor = this.store.select(selectMonitorItems).pipe(
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
