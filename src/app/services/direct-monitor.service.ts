import { inject, Injectable, isDevMode } from '@angular/core';
import {
  collection,
  Firestore,
  getDocs,
  limit,
  query,
  where,
} from '@angular/fire/firestore';
import { from, map, Observable, shareReplay } from 'rxjs';

export interface IdName {
  id: string;
  name: string;
}

export interface Fulltext {
  fulltext: string;
}

export interface MonitorItem {
  id: string;
  communication: string;
  today_average: number;
  since_year_average: number;
  since_month_average: number;
  weekly_comparable: number;
  monthly_comparable: number;
  portal: string;
  system_name: string;
  today_comparable: number;
  last_month_average: number;
  three_days_comparable: number;
  yesterday_comparable: number;
  system_active: boolean;
  region: string[];
  alerts_from_portal: {
    quantity: number;
    highestImpact: string;
  };
  kwp: number;
  comments: string;
  close_issues: number;
  open_issues: number;
  client: IdName;
  monthly_percent: number;
  three_days_percent: number;
  today_percent: number;
  weekly_percent: number;
  yesterday_percent: number;
}

@Injectable({
  providedIn: 'root',
})
export class DirectMonitorService {
  private firestore = inject(Firestore);

  private collection = collection(this.firestore, 'directMoniterLife');

  public readonly monitor = this.getAll().pipe(
    map((data) => data || []),
    shareReplay({ bufferSize: 1, refCount: true })
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

  getAll(): Observable<MonitorItem[]> {
    const limitedQuery = isDevMode()
      ? query(this.collection, limit(200))
      : query(this.collection);
    return from(getDocs(limitedQuery)).pipe(
      map((querySnapshot) =>
        querySnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as MonitorItem
        )
      )
    );
  }
}
